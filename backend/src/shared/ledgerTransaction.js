import crypto from 'crypto';
import { toCanonicalJson } from './canonicalJson.js';

/**
 * appendLedgerEvent
 *
 * Must be called INSIDE an existing database transaction (client must be a pg PoolClient
 * already inside BEGIN...COMMIT).
 *
 * Steps:
 * 1. Lock the organisation row (FOR UPDATE) to serialise concurrent appends
 * 2. Query the last ledger event for this org to get sequence_number and previous_hash
 * 3. Compute new sequence_number = last + 1 (or 1 if none)
 * 4. Compute SHA-256 event_hash over canonical JSON of the event fields
 * 5. Load ACTIVE Ed25519 signing key for the org
 * 6. Sign event_hash buffer with Ed25519 private key (resolved from env map)
 * 7. INSERT into ledger_events
 * 8. Return the new ledger event row
 *
 * @param {import('pg').PoolClient} client
 * @param {Object} params
 * @param {string} params.organisationId
 * @param {string} params.eventKind   — ledger_event_type enum value
 * @param {string} params.sourceTable — e.g. 'contributions'
 * @param {string} params.sourceId    — UUID of source record
 * @param {Object} params.payload     — event-specific payload (PII stripped by canonicalJson)
 * @param {string} params.createdBy   — user UUID
 * @returns {Promise<Object>} the inserted ledger_events row
 */
export async function appendLedgerEvent(client, {
  organisationId,
  eventKind,
  sourceTable,
  sourceId,
  payload,
  createdBy,
}) {
  // Step 1: Lock organisation row to serialise concurrent appends
  const orgLock = await client.query(
    'SELECT id FROM organisations WHERE id = $1 FOR UPDATE',
    [organisationId]
  );
  if (!orgLock.rows.length) {
    throw new Error(`Organisation ${organisationId} not found.`);
  }

  // Step 2: Get last event for this org
  const lastEvent = await client.query(
    `SELECT sequence_number, event_hash
     FROM ledger_events
     WHERE organisation_id = $1
     ORDER BY sequence_number DESC
     LIMIT 1`,
    [organisationId]
  );

  const last = lastEvent.rows[0] ?? null;
  const sequence_number = last ? Number(last.sequence_number) + 1 : 1;
  const previous_hash = last ? last.event_hash : null;

  // Step 3: Compute event_hash
  const hashInput = toCanonicalJson({
    organisationId,
    sequence_number,
    eventKind,
    sourceTable: sourceTable ?? null,
    sourceId: sourceId ?? null,
    previous_hash,
    payload,
  });
  const event_hash = crypto.createHash('sha256').update(hashInput).digest('hex');

  // Step 4: Load active signing key
  const keyResult = await client.query(
    `SELECT id, public_key_pem, private_key_location_reference
     FROM signing_keys
     WHERE organisation_id = $1 AND status = 'ACTIVE'
     ORDER BY key_version DESC
     LIMIT 1`,
    [organisationId]
  );
  if (!keyResult.rows.length) {
    throw new Error(`No active signing key found for organisation ${organisationId}.`);
  }
  const signingKey = keyResult.rows[0];

  // Step 5: Resolve private key from env/secret map
  const privateKeyPem = resolvePrivateKey(signingKey.private_key_location_reference);

  // Step 6: Sign the event_hash buffer
  const signature_base64 = crypto
    .sign(null, Buffer.from(event_hash, 'hex'), { key: privateKeyPem, dsaEncoding: 'der' })
    .toString('base64');

  // Step 7: Insert ledger event
  const inserted = await client.query(
    `INSERT INTO ledger_events
       (organisation_id, sequence_number, event_kind, source_table, source_id,
        event_payload, previous_hash, event_hash, signature_base64,
        signing_key_id, created_by, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now())
     RETURNING *`,
    [
      organisationId,
      sequence_number,
      eventKind,
      sourceTable ?? null,
      sourceId ?? null,
      JSON.stringify(payload),
      previous_hash,
      event_hash,
      signature_base64,
      signingKey.id,
      createdBy ?? null,
    ]
  );

  return inserted.rows[0];
}

/**
 * Resolves a private key PEM from the local environment map.
 * In production, replace this with a KMS/HSM call.
 *
 * The env var is named after the reference string, e.g.:
 *   SIGNING_KEY_local_dev_v1 -> actual PEM
 */
function resolvePrivateKey(reference) {
  // Try exact env var name (dots replaced with underscores)
  const envKey = reference.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const pem = process.env[envKey] ?? process.env.SIGNING_KEY_DEFAULT;
  if (!pem) {
    throw new Error(
      `Cannot resolve signing key for reference '${reference}'. ` +
      `Set env var '${envKey}' or 'SIGNING_KEY_DEFAULT' to the PEM-encoded Ed25519 private key.`
    );
  }
  return pem;
}
