/**
 * contributions/service.js
 * Handles programmes, fund pools, contributions, allocations, and tax treatment assessments.
 */
import crypto from 'crypto';
import { query, withTransaction } from '../../config/db.js';
import { assertSameOrganisation } from '../../shared/tenantGuards.js';
import { appendLedgerEvent } from '../../shared/ledgerTransaction.js';

// ─── Programmes ────────────────────────────────────────────────────────────

export async function createProgramme(organisationId, data) {
  const res = await query(
    `INSERT INTO programmes (organisation_id, programme_code, name, purpose, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, organisation_id, programme_code, name, purpose, description, is_active, created_at`,
    [organisationId, data.programme_code, data.name, data.purpose, data.description ?? null]
  );
  return res.rows[0];
}

export async function listProgrammes(organisationId) {
  const res = await query(
    `SELECT id, programme_code, name, purpose, description, is_active, created_at
     FROM programmes WHERE organisation_id = $1 ORDER BY created_at`,
    [organisationId]
  );
  return res.rows;
}

export async function getProgramme(organisationId, programmeId) {
  const res = await query(
    `SELECT id, programme_code, name, purpose, description, is_active, created_at
     FROM programmes WHERE id = $1 AND organisation_id = $2`,
    [programmeId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Programme not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Fund Pools ────────────────────────────────────────────────────────────

export async function createFundPool(organisationId, data) {
  const res = await query(
    `INSERT INTO fund_pools (organisation_id, pool_code, name, source_origin, fund_class, receipt_class, purpose, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, organisation_id, pool_code, name, source_origin, fund_class, receipt_class, purpose, currency, is_active, created_at`,
    [organisationId, data.pool_code, data.name, data.source_origin, data.fund_class, data.receipt_class, data.purpose, data.currency ?? 'INR']
  );
  return res.rows[0];
}

export async function listFundPools(organisationId) {
  const res = await query(
    `SELECT id, pool_code, name, source_origin, fund_class, receipt_class, purpose, currency, is_active, created_at
     FROM fund_pools WHERE organisation_id = $1 ORDER BY created_at`,
    [organisationId]
  );
  return res.rows;
}

export async function getFundPool(organisationId, fundPoolId) {
  const res = await query(
    `SELECT id, pool_code, name, source_origin, fund_class, receipt_class, purpose, currency, is_active, created_at
     FROM fund_pools WHERE id = $1 AND organisation_id = $2`,
    [fundPoolId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Fund pool not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Contributions ─────────────────────────────────────────────────────────

/**
 * Create a contribution:
 * 1. Verify fund pool belongs to this org
 * 2. Insert contribution (triggers enforce pool match classification)
 * 3. Generate 32-byte random token; store only SHA-256 hash in public_receipt_tokens
 * 4. Emit CONTRIBUTION_RECEIVED ledger event
 * 5. Return raw token ONCE
 */
export async function createContribution(organisationId, createdBy, data) {
  return withTransaction(async (client) => {
    // Verify fund pool belongs to org
    await assertSameOrganisation(client, 'fund_pools', data.fund_pool_id, organisationId);

    const contribRes = await client.query(
      `INSERT INTO contributions
         (organisation_id, fund_pool_id, receipt_number, donor_reference, payment_provider_reference,
          amount, currency, source_origin, fund_class, receipt_class, purpose,
          received_at, tax_year, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'RECEIVED')
       RETURNING id, receipt_number, amount, currency, source_origin, fund_class,
                 receipt_class, purpose, status, received_at, tax_year`,
      [
        organisationId, data.fund_pool_id, data.receipt_number,
        data.donor_reference ?? null, data.payment_provider_reference ?? null,
        data.amount, data.currency ?? 'INR',
        data.source_origin, data.fund_class, data.receipt_class, data.purpose,
        data.received_at, data.tax_year ?? null,
      ]
    );
    const contribution = contribRes.rows[0];

    // Generate receipt token (32-byte random hex → store SHA-256 hash only)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await client.query(
      `INSERT INTO public_receipt_tokens (contribution_id, token_hash, is_active)
       VALUES ($1, $2, TRUE)`,
      [contribution.id, tokenHash]
    );

    // Ledger event — strip PII from payload
    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'CONTRIBUTION_RECEIVED',
      sourceTable: 'contributions',
      sourceId: contribution.id,
      payload: {
        receipt_number: contribution.receipt_number,
        amount: contribution.amount,
        currency: contribution.currency,
        source_origin: contribution.source_origin,
        fund_class: contribution.fund_class,
        receipt_class: contribution.receipt_class,
        purpose: contribution.purpose,
      },
      createdBy,
    });

    return { contribution, receipt_token: rawToken };
  });
}

export async function listContributions(organisationId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const res = await query(
    `SELECT id, fund_pool_id, receipt_number, amount, currency, source_origin,
            fund_class, receipt_class, purpose, status, received_at, tax_year, created_at
     FROM contributions WHERE organisation_id = $1 AND status <> 'REVERSED'
     ORDER BY received_at DESC LIMIT $2 OFFSET $3`,
    [organisationId, limit, offset]
  );
  return res.rows;
}

export async function getContribution(organisationId, contributionId) {
  const res = await query(
    `SELECT id, fund_pool_id, receipt_number, amount, currency, source_origin,
            fund_class, receipt_class, purpose, status, received_at, tax_year, created_at
     FROM contributions WHERE id = $1 AND organisation_id = $2`,
    [contributionId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Contribution not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

/**
 * ER-01: Reverse and reclassify a contribution.
 * Never UPDATE classification columns — mark original REVERSED, insert corrected record.
 */
export async function reverseAndReclassify(organisationId, contributionId, createdBy, { new_fund_pool_id, reason }) {
  return withTransaction(async (client) => {
    // Lock and fetch original
    const origRes = await client.query(
      `SELECT * FROM contributions WHERE id = $1 AND organisation_id = $2 FOR UPDATE`,
      [contributionId, organisationId]
    );
    if (!origRes.rows.length) { const err = new Error('Contribution not found.'); err.status = 404; throw err; }
    const orig = origRes.rows[0];
    if (orig.status === 'REVERSED') { const err = new Error('Contribution already reversed.'); err.status = 409; throw err; }

    // Verify new fund pool belongs to org
    await assertSameOrganisation(client, 'fund_pools', new_fund_pool_id, organisationId);

    // Fetch new pool to get its classification
    const poolRes = await client.query(
      `SELECT source_origin, fund_class, receipt_class, purpose FROM fund_pools WHERE id = $1`,
      [new_fund_pool_id]
    );
    const pool = poolRes.rows[0];

    // Mark original REVERSED (the classification_immutable trigger blocks UPDATE on classification cols)
    await client.query(
      `UPDATE contributions SET status = 'REVERSED' WHERE id = $1`,
      [contributionId]
    );

    // Insert corrected contribution (pool's classification auto-validated by trg_contribution_pool_match)
    const newRes = await client.query(
      `INSERT INTO contributions
         (organisation_id, fund_pool_id, receipt_number, donor_reference, payment_provider_reference,
          amount, currency, source_origin, fund_class, receipt_class, purpose,
          received_at, tax_year, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'RECEIVED')
       RETURNING id, receipt_number, amount, currency, source_origin, fund_class,
                 receipt_class, purpose, status, received_at`,
      [
        organisationId, new_fund_pool_id,
        orig.receipt_number + '-R',
        orig.donor_reference, orig.payment_provider_reference,
        orig.amount, orig.currency,
        pool.source_origin, pool.fund_class, pool.receipt_class, pool.purpose,
        orig.received_at, orig.tax_year,
      ]
    );
    const corrected = newRes.rows[0];

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'CLASSIFICATION_CORRECTED',
      sourceTable: 'contributions',
      sourceId: corrected.id,
      payload: {
        original_contribution_id: contributionId,
        new_fund_pool_id,
        reason,
        corrected_receipt_number: corrected.receipt_number,
        new_source_origin: pool.source_origin,
        new_fund_class: pool.fund_class,
      },
      createdBy,
    });

    return { original: { id: contributionId, status: 'REVERSED' }, corrected };
  });
}

// ─── Allocations (ER-04) ───────────────────────────────────────────────────

export async function createAllocation(organisationId, contributionId, createdBy, data) {
  return withTransaction(async (client) => {
    // Verify contribution belongs to org
    await assertSameOrganisation(client, 'contributions', contributionId, organisationId);
    // Verify programme belongs to org
    await assertSameOrganisation(client, 'programmes', data.programme_id, organisationId);

    // Insert — trg_contribution_allocation_cap enforces total ≤ contribution.amount
    const res = await client.query(
      `INSERT INTO contribution_allocations (contribution_id, programme_id, amount, currency, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, contribution_id, programme_id, amount, currency, note, created_at`,
      [contributionId, data.programme_id, data.amount, data.currency ?? 'INR', data.note ?? null]
    );
    const allocation = res.rows[0];

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'ALLOCATION_CREATED',
      sourceTable: 'contribution_allocations',
      sourceId: allocation.id,
      payload: {
        contribution_id: contributionId,
        programme_id: data.programme_id,
        amount: data.amount,
        currency: data.currency ?? 'INR',
      },
      createdBy,
    });

    return allocation;
  });
}

export async function listAllocations(organisationId, contributionId) {
  await assertSameOrganisation(null, 'contributions', contributionId, organisationId);
  const res = await query(
    `SELECT ca.id, ca.programme_id, ca.amount, ca.currency, ca.note, ca.created_at,
            p.name AS programme_name
     FROM contribution_allocations ca
     JOIN programmes p ON p.id = ca.programme_id
     WHERE ca.contribution_id = $1`,
    [contributionId]
  );
  return res.rows;
}

// ─── Tax Treatment Assessments ─────────────────────────────────────────────

export async function upsertTaxAssessment(organisationId, contributionId, data) {
  // Verify contribution belongs to org
  const check = await query(
    `SELECT id FROM contributions WHERE id = $1 AND organisation_id = $2`,
    [contributionId, organisationId]
  );
  if (!check.rows.length) { const err = new Error('Contribution not found.'); err.status = 404; throw err; }

  const res = await query(
    `INSERT INTO tax_treatment_assessments
       (contribution_id, claim_basis, assessed_amount, currency, legal_rule_reference, rule_version, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (contribution_id) DO UPDATE SET
       claim_basis = EXCLUDED.claim_basis,
       assessed_amount = EXCLUDED.assessed_amount,
       currency = EXCLUDED.currency,
       legal_rule_reference = EXCLUDED.legal_rule_reference,
       rule_version = EXCLUDED.rule_version,
       note = EXCLUDED.note,
       updated_at = now()
     RETURNING id, contribution_id, claim_basis, assessed_amount, currency,
               legal_rule_reference, rule_version, note`,
    [
      contributionId, data.claim_basis, data.assessed_amount,
      data.currency ?? 'INR', data.legal_rule_reference ?? null,
      data.rule_version, data.note ?? null,
    ]
  );
  return res.rows[0];
}

export async function getTaxAssessment(organisationId, contributionId) {
  const check = await query(
    `SELECT id FROM contributions WHERE id = $1 AND organisation_id = $2`,
    [contributionId, organisationId]
  );
  if (!check.rows.length) { const err = new Error('Contribution not found.'); err.status = 404; throw err; }

  const res = await query(
    `SELECT id, contribution_id, claim_basis, assessed_amount, currency,
            legal_rule_reference, rule_version, note, created_at
     FROM tax_treatment_assessments WHERE contribution_id = $1`,
    [contributionId]
  );
  if (!res.rows.length) { const err = new Error('Tax assessment not found.'); err.status = 404; throw err; }
  return res.rows[0];
}
