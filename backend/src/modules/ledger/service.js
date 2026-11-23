/**
 * ledger/service.js
 * Signing key management, ledger event reads, chain verification (ER-07), and batch anchoring.
 */
import crypto from 'crypto';
import { query, withTransaction } from '../../config/db.js';

// ─── Signing Keys ──────────────────────────────────────────────────────────

/**
 * Create a new ACTIVE signing key.
 * Rotates any existing ACTIVE key for this org to ROTATED first.
 * NEVER returns private_key_location_reference in response.
 */
export async function createSigningKey(organisationId, data) {
  return withTransaction(async (client) => {
    // Rotate existing ACTIVE key
    await client.query(
      `UPDATE signing_keys SET status = 'ROTATED', rotated_at = now()
       WHERE organisation_id = $1 AND status = 'ACTIVE'`,
      [organisationId]
    );

    const res = await client.query(
      `INSERT INTO signing_keys
         (organisation_id, key_name, key_version, algorithm, public_key_pem,
          private_key_location_reference, status, activated_at)
       VALUES ($1,$2,$3,'Ed25519',$4,$5,'ACTIVE',$6)
       RETURNING id, organisation_id, key_name, key_version, algorithm,
                 public_key_pem, status, activated_at, created_at`,
      // private_key_location_reference stored but NOT in RETURNING
      [
        organisationId, data.key_name, data.key_version,
        data.public_key_pem, data.private_key_location_reference,
        data.activated_at ?? new Date().toISOString(),
      ]
    );
    // Response excludes private_key_location_reference
    return res.rows[0];
  });
}

export async function listSigningKeys(organisationId) {
  const res = await query(
    `SELECT id, key_name, key_version, algorithm, public_key_pem, status, activated_at, rotated_at, created_at
     FROM signing_keys WHERE organisation_id = $1 ORDER BY created_at DESC`,
    [organisationId]
  );
  // Never return private_key_location_reference
  return res.rows;
}

export async function revokeSigningKey(organisationId, keyId) {
  const res = await query(
    `UPDATE signing_keys SET status = 'REVOKED'
     WHERE id = $1 AND organisation_id = $2
     RETURNING id, status`,
    [keyId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Signing key not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Ledger Events ─────────────────────────────────────────────────────────

export async function listLedgerEvents(organisationId, { page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  const res = await query(
    `SELECT id, sequence_number, event_kind, source_table, source_id,
            event_hash, previous_hash, signing_key_id, created_by, created_at
     FROM ledger_events WHERE organisation_id = $1
     ORDER BY sequence_number ASC LIMIT $2 OFFSET $3`,
    [organisationId, limit, offset]
  );
  return res.rows;
}

export async function getLedgerEvent(organisationId, eventId) {
  const res = await query(
    `SELECT id, sequence_number, event_kind, source_table, source_id,
            event_payload, event_hash, previous_hash, signing_key_id,
            signature_base64, created_by, created_at
     FROM ledger_events WHERE id = $1 AND organisation_id = $2`,
    [eventId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Ledger event not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Chain Verification (ER-07) ────────────────────────────────────────────

/**
 * Walk all ledger events for an org in ascending sequence_number order.
 * For each event:
 * 1. Check previous_hash matches the previous event's event_hash
 * 2. Recompute SHA-256 event_hash and confirm it matches stored value
 * 3. Verify Ed25519 signature with the signing key's public_key_pem
 */
export async function verifyChain(organisationId) {
  const eventsRes = await query(
    `SELECT le.id, le.sequence_number, le.event_hash, le.previous_hash,
            le.event_payload, le.signature_base64, le.signing_key_id,
            sk.public_key_pem
     FROM ledger_events le
     LEFT JOIN signing_keys sk ON sk.id = le.signing_key_id
     WHERE le.organisation_id = $1
     ORDER BY le.sequence_number ASC`,
    [organisationId]
  );

  const events = eventsRes.rows;
  const errors = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];

    // Check previous hash chain
    const expectedPrevHash = i === 0 ? '0'.repeat(64) : events[i - 1].event_hash;
    if (ev.previous_hash !== expectedPrevHash) {
      errors.push({ sequence_number: ev.sequence_number, error: `previous_hash mismatch (expected ${expectedPrevHash.slice(0, 8)}…)` });
    }

    // Recompute event_hash
    const payloadStr = typeof ev.event_payload === 'string'
      ? ev.event_payload
      : JSON.stringify(ev.event_payload);
    const recomputed = crypto.createHash('sha256').update(payloadStr).digest('hex');
    if (recomputed !== ev.event_hash) {
      errors.push({ sequence_number: ev.sequence_number, error: 'event_hash mismatch (payload tampered)' });
    }

    // Verify Ed25519 signature
    if (ev.public_key_pem && ev.signature_base64) {
      try {
        const hashBuffer = Buffer.from(ev.event_hash, 'hex');
        const signatureBuffer = Buffer.from(ev.signature_base64, 'base64');
        const valid = crypto.verify(null, hashBuffer, { key: ev.public_key_pem, dsaEncoding: 'der' }, signatureBuffer);
        if (!valid) {
          errors.push({ sequence_number: ev.sequence_number, error: 'Ed25519 signature invalid' });
        }
      } catch (sigErr) {
        errors.push({ sequence_number: ev.sequence_number, error: `Signature verify error: ${sigErr.message}` });
      }
    }
  }

  return {
    total_events: events.length,
    valid: errors.length === 0,
    errors,
  };
}

// ─── Ledger Batches ────────────────────────────────────────────────────────

export async function createBatch(organisationId, createdBy, data) {
  return withTransaction(async (client) => {
    // Fetch events in the batch range
    const eventsRes = await client.query(
      `SELECT event_hash FROM ledger_events
       WHERE organisation_id = $1 AND sequence_number BETWEEN $2 AND $3
       ORDER BY sequence_number ASC`,
      [organisationId, data.first_sequence, data.last_sequence]
    );

    if (!eventsRes.rows.length) {
      const err = new Error('No ledger events found in the specified sequence range.'); err.status = 400; throw err;
    }

    // Compute root_hash = SHA-256 of concatenated event hashes
    const concatenated = eventsRes.rows.map(r => r.event_hash).join('');
    const root_hash = crypto.createHash('sha256').update(concatenated).digest('hex');

    const batchRes = await client.query(
      `INSERT INTO ledger_batches
         (organisation_id, first_sequence, last_sequence, root_hash,
          anchor_kind, published_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, first_sequence, last_sequence, root_hash, anchor_kind, published_url, created_at`,
      [
        organisationId, data.first_sequence, data.last_sequence,
        root_hash, data.anchor_kind ?? 'PUBLISHED_HASH',
        data.published_url ?? null, createdBy,
      ]
    );
    return batchRes.rows[0];
  });
}

export async function listBatches(organisationId) {
  const res = await query(
    `SELECT id, first_sequence, last_sequence, root_hash, anchor_kind, published_url, created_at
     FROM ledger_batches WHERE organisation_id = $1 ORDER BY created_at DESC`,
    [organisationId]
  );
  return res.rows;
}
