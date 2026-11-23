/**
 * compliance/service.js
 * Funding agreements, disbursements (ER-02, ER-03), and compliance rules.
 * ER-02: trg_block_foreign_partner_transfer — FOREIGN fund → PARTNER_NGO blocked by trigger
 * ER-03: trg_conditional_release_agreement — conditional_release=true needs VERIFIED agreement
 */
import { query, withTransaction } from '../../config/db.js';
import { assertSameOrganisation } from '../../shared/tenantGuards.js';
import { appendLedgerEvent } from '../../shared/ledgerTransaction.js';

// ─── Funding Agreements ────────────────────────────────────────────────────

export async function createAgreement(organisationId, data) {
  const res = await query(
    `INSERT INTO funding_agreements
       (implementing_organisation_id, funder_organisation_id, agreement_code,
        status, conditional_disbursement_allowed, starts_on, ends_on)
     VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6)
     RETURNING id, agreement_code, status, conditional_disbursement_allowed, starts_on, ends_on, created_at`,
    [
      organisationId,
      data.funder_organisation_id ?? null,
      data.agreement_code,
      data.conditional_disbursement_allowed ?? false,
      data.starts_on ?? null,
      data.ends_on ?? null,
    ]
  );
  return res.rows[0];
}

export async function listAgreements(organisationId) {
  const res = await query(
    `SELECT id, agreement_code, funder_organisation_id, status, conditional_disbursement_allowed,
            starts_on, ends_on, created_at
     FROM funding_agreements WHERE implementing_organisation_id = $1 ORDER BY created_at DESC`,
    [organisationId]
  );
  return res.rows;
}

export async function getAgreement(organisationId, agreementId) {
  const res = await query(
    `SELECT id, agreement_code, funder_organisation_id, status, conditional_disbursement_allowed,
            starts_on, ends_on, created_at
     FROM funding_agreements WHERE id = $1 AND implementing_organisation_id = $2`,
    [agreementId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Agreement not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

export async function verifyAgreement(organisationId, agreementId, { status, conditional_disbursement_allowed }) {
  const existing = await query(
    `SELECT id FROM funding_agreements WHERE id = $1 AND implementing_organisation_id = $2`,
    [agreementId, organisationId]
  );
  if (!existing.rows.length) { const err = new Error('Agreement not found.'); err.status = 404; throw err; }

  const sets = ['status = $1'];
  const params = [status, agreementId];
  if (conditional_disbursement_allowed !== undefined) {
    sets.push(`conditional_disbursement_allowed = $${params.length + 1}`);
    params.splice(params.length - 1, 0, conditional_disbursement_allowed);
  }

  const res = await query(
    `UPDATE funding_agreements SET ${sets.join(', ')} WHERE id = $${params.length}
     RETURNING id, agreement_code, status, conditional_disbursement_allowed`,
    params
  );
  return res.rows[0];
}

// ─── Compliance Rules (platform-global, no org_id) ─────────────────────────

export async function createComplianceRule(data) {
  const res = await query(
    `INSERT INTO compliance_rules
       (rule_code, rule_version, jurisdiction, legal_reference, description, configuration, effective_from, effective_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, rule_code, rule_version, jurisdiction, description, configuration,
               effective_from, effective_until, is_enabled, created_at`,
    [
      data.rule_code, data.rule_version, data.jurisdiction ?? 'IN',
      data.legal_reference ?? null, data.description,
      JSON.stringify(data.configuration ?? {}),
      data.effective_from ?? null, data.effective_until ?? null,
    ]
  );
  return res.rows[0];
}

export async function listComplianceRules() {
  const res = await query(
    `SELECT id, rule_code, rule_version, jurisdiction, description, configuration,
            effective_from, effective_until, is_enabled, created_at
     FROM compliance_rules ORDER BY created_at`,
    []
  );
  return res.rows;
}

// ─── Disbursements ─────────────────────────────────────────────────────────

/**
 * Create a disbursement in DRAFT status.
 * Triggers ER-02 and ER-03 fire at INSERT time (before INSERT trigger).
 */
export async function createDisbursement(organisationId, createdBy, data) {
  return withTransaction(async (client) => {
    // Verify fund_pool belongs to org
    await assertSameOrganisation(client, 'fund_pools', data.fund_pool_id, organisationId);

    // Verify programme if provided
    if (data.programme_id) {
      await assertSameOrganisation(client, 'programmes', data.programme_id, organisationId);
    }

    // Verify funding agreement belongs to this org via implementing_organisation_id
    if (data.funding_agreement_id) {
      const agRes = await client.query(
        `SELECT id FROM funding_agreements WHERE id = $1 AND implementing_organisation_id = $2`,
        [data.funding_agreement_id, organisationId]
      );
      if (!agRes.rows.length) {
        const err = new Error('Funding agreement not found or not owned by this organisation.'); err.status = 403; throw err;
      }
    }

    // Insert — triggers ER-02 and ER-03 fire here
    const res = await client.query(
      `INSERT INTO disbursements
         (organisation_id, fund_pool_id, programme_id, funding_agreement_id,
          conditional_release, recipient_kind, recipient_organisation_id,
          recipient_reference, amount, currency, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'DRAFT',$11)
       RETURNING id, fund_pool_id, programme_id, funding_agreement_id,
                 conditional_release, recipient_kind, amount, currency, status, created_at`,
      [
        organisationId, data.fund_pool_id, data.programme_id ?? null,
        data.funding_agreement_id ?? null, data.conditional_release ?? false,
        data.recipient_kind, data.recipient_organisation_id ?? null,
        data.recipient_reference ?? null, data.amount, data.currency ?? 'INR',
        createdBy,
      ]
    );
    const disbursement = res.rows[0];

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'DISBURSEMENT_CREATED',
      sourceTable: 'disbursements',
      sourceId: disbursement.id,
      payload: {
        fund_pool_id: data.fund_pool_id,
        amount: data.amount,
        currency: data.currency ?? 'INR',
        recipient_kind: data.recipient_kind,
        conditional_release: data.conditional_release ?? false,
      },
      createdBy,
    });

    return disbursement;
  });
}

export async function listDisbursements(organisationId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const res = await query(
    `SELECT id, fund_pool_id, programme_id, funding_agreement_id, conditional_release,
            recipient_kind, amount, currency, status, created_at
     FROM disbursements WHERE organisation_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [organisationId, limit, offset]
  );
  return res.rows;
}

export async function getDisbursement(organisationId, disbursementId) {
  const res = await query(
    `SELECT id, fund_pool_id, programme_id, funding_agreement_id, conditional_release,
            recipient_kind, recipient_reference, amount, currency, status,
            approval_note, payment_reference, created_at
     FROM disbursements WHERE id = $1 AND organisation_id = $2`,
    [disbursementId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Disbursement not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

/**
 * Approve a disbursement — lock fund pool, verify sufficient balance.
 */
export async function approveDisbursement(organisationId, disbursementId, createdBy, { approval_note }) {
  return withTransaction(async (client) => {
    const diRes = await client.query(
      `SELECT * FROM disbursements WHERE id = $1 AND organisation_id = $2 FOR UPDATE`,
      [disbursementId, organisationId]
    );
    if (!diRes.rows.length) { const err = new Error('Disbursement not found.'); err.status = 404; throw err; }
    const disbursement = diRes.rows[0];
    if (disbursement.status !== 'PENDING_APPROVAL') {
      const err = new Error(`Disbursement status is '${disbursement.status}', must be PENDING_APPROVAL.`); err.status = 409; throw err;
    }

    // Lock fund pool and check balance
    const poolRes = await client.query(
      `SELECT id FROM fund_pools WHERE id = $1 FOR UPDATE`,
      [disbursement.fund_pool_id]
    );
    if (!poolRes.rows.length) { const err = new Error('Fund pool not found.'); err.status = 404; throw err; }

    const balanceRes = await client.query(
      `SELECT
         COALESCE(SUM(c.amount) FILTER (WHERE c.status <> 'REVERSED'), 0)
         - COALESCE(SUM(d.amount) FILTER (WHERE d.status IN ('APPROVED','PAID')), 0) AS available
       FROM fund_pools fp
       LEFT JOIN contributions c ON c.fund_pool_id = fp.id
       LEFT JOIN disbursements d ON d.fund_pool_id = fp.id
       WHERE fp.id = $1`,
      [disbursement.fund_pool_id]
    );
    const available = parseFloat(balanceRes.rows[0].available ?? '0');
    if (available < disbursement.amount) {
      const err = new Error(`Insufficient pool balance. Available: ${available}, required: ${disbursement.amount}.`); err.status = 422; throw err;
    }

    await client.query(
      `UPDATE disbursements SET status = 'APPROVED', approval_note = $1 WHERE id = $2`,
      [approval_note ?? null, disbursementId]
    );

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'DISBURSEMENT_APPROVED',
      sourceTable: 'disbursements',
      sourceId: disbursementId,
      payload: {
        fund_pool_id: disbursement.fund_pool_id,
        amount: disbursement.amount,
        currency: disbursement.currency,
        recipient_kind: disbursement.recipient_kind,
        available_before: available,
      },
      createdBy,
    });

    return { id: disbursementId, status: 'APPROVED', approval_note: approval_note ?? null };
  });
}

export async function submitDisbursement(organisationId, disbursementId) {
  const res = await query(
    `UPDATE disbursements SET status = 'PENDING_APPROVAL'
     WHERE id = $1 AND organisation_id = $2 AND status = 'DRAFT'
     RETURNING id, status`,
    [disbursementId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Disbursement not found or not in DRAFT status.'); err.status = 409; throw err; }
  return res.rows[0];
}

export async function payDisbursement(organisationId, disbursementId, createdBy, { payment_reference }) {
  return withTransaction(async (client) => {
    const diRes = await client.query(
      `SELECT * FROM disbursements WHERE id = $1 AND organisation_id = $2 FOR UPDATE`,
      [disbursementId, organisationId]
    );
    if (!diRes.rows.length) { const err = new Error('Disbursement not found.'); err.status = 404; throw err; }
    const disbursement = diRes.rows[0];
    if (disbursement.status !== 'APPROVED') {
      const err = new Error('Only APPROVED disbursements can be paid.'); err.status = 409; throw err;
    }

    await client.query(
      `UPDATE disbursements SET status = 'PAID', payment_reference = $1, paid_at = now()
       WHERE id = $2`,
      [payment_reference, disbursementId]
    );

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'DISBURSEMENT_PAID',
      sourceTable: 'disbursements',
      sourceId: disbursementId,
      payload: {
        amount: disbursement.amount,
        currency: disbursement.currency,
        recipient_kind: disbursement.recipient_kind,
      },
      createdBy,
    });

    return { id: disbursementId, status: 'PAID' };
  });
}

/**
 * Run enabled compliance rules against an org's disbursements (simplified evaluator).
 */
export async function evaluateCompliance(organisationId, createdBy) {
  const rules = await query(`SELECT * FROM compliance_rules WHERE is_enabled = TRUE`, []);
  const disbursements = await query(
    `SELECT * FROM disbursements WHERE organisation_id = $1`, [organisationId]
  );

  const checks = [];
  for (const rule of rules.rows) {
    for (const disbursement of disbursements.rows) {
      let outcome = 'PASS';
      let details = {};

      // Example rule: flag PAID disbursements without payment_reference
      if (rule.rule_code === 'PAYMENT_REF_REQUIRED' && disbursement.status === 'PAID' && !disbursement.payment_reference) {
        outcome = 'FAIL';
        details = { reason: 'PAID disbursement missing payment_reference' };
      }

      const res = await query(
        `INSERT INTO compliance_checks
           (compliance_rule_id, organisation_id, source_table, source_id, outcome, details, checked_by)
         VALUES ($1,$2,'disbursements',$3,$4,$5,$6)
         RETURNING id, compliance_rule_id, outcome, created_at`,
        [rule.id, organisationId, disbursement.id, outcome, JSON.stringify(details), createdBy]
      );
      checks.push(res.rows[0]);
    }
  }
  return checks;
}
