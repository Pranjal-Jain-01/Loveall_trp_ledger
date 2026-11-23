import crypto from 'crypto';
import { query } from '../../config/db.js';

// Allowlisted DTO fields for public receipt response (ER-09)
function buildPublicReceiptDTO(contribution, allocations, activities, ledgerEvent) {
  return {
    receipt_number: contribution.receipt_number,
    amount: contribution.amount,
    currency: contribution.currency,
    purpose: contribution.purpose,
    fund_class: contribution.fund_class,
    receipt_class: contribution.receipt_class,
    source_origin: contribution.source_origin,
    status: contribution.status,
    received_at: contribution.received_at,
    tax_year: contribution.tax_year ?? null,
    // Explicitly excluded: donor_reference, payment_provider_reference
    programme_allocations: allocations.map(a => ({
      programme_name: a.programme_name,
      programme_purpose: a.programme_purpose,
      amount: a.amount,
      currency: a.currency,
    })),
    activity_impact: activities.map(a => ({
      impact_state: a.impact_state,
    })),
    ledger_event_hash: ledgerEvent?.event_hash ?? null,
    // Explicitly excluded: signature_base64, event_payload details
  };
}

export async function getPublicReceipt(rawToken) {
  if (!rawToken || rawToken.length < 20) {
    throw Object.assign(new Error('Invalid token.'), { status: 400 });
  }

  const token_hash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Verify token is active and not expired
  const tokenResult = await query(
    `SELECT prt.contribution_id
     FROM public_receipt_tokens prt
     WHERE prt.token_hash = $1
       AND prt.is_active = TRUE
       AND (prt.expires_at IS NULL OR prt.expires_at > now())`,
    [token_hash]
  );
  if (!tokenResult.rows.length) {
    throw Object.assign(new Error('Receipt not found or token expired.'), { status: 404 });
  }
  const { contribution_id } = tokenResult.rows[0];

  // Fetch contribution — allowlisted fields only (no donor_reference, payment_provider_reference)
  const contribResult = await query(
    `SELECT c.id, c.receipt_number, c.amount, c.currency,
            c.source_origin, c.fund_class, c.receipt_class, c.purpose,
            c.status, c.received_at, c.tax_year,
            fp.name AS fund_pool_name
     FROM contributions c
     JOIN fund_pools fp ON fp.id = c.fund_pool_id
     WHERE c.id = $1`,
    [contribution_id]
  );
  if (!contribResult.rows.length) {
    throw Object.assign(new Error('Contribution not found.'), { status: 404 });
  }
  const contribution = contribResult.rows[0];

  // Fetch programme allocations
  const allocResult = await query(
    `SELECT ca.amount, ca.currency, p.name AS programme_name, p.purpose AS programme_purpose
     FROM contribution_allocations ca
     JOIN programmes p ON p.id = ca.programme_id
     WHERE ca.contribution_id = $1`,
    [contribution_id]
  );

  // Fetch associated activity impact states via disbursements → activities
  const activityResult = await query(
    `SELECT ae.impact_state
     FROM activity_events ae
     JOIN disbursements d ON d.id = ae.disbursement_id
     WHERE d.fund_pool_id = $1 AND d.status IN ('APPROVED','PAID')
     ORDER BY ae.created_at DESC
     LIMIT 5`,
    [contribution.fund_pool_id ?? null]
  );

  // Fetch the CONTRIBUTION_RECEIVED ledger event hash for this contribution
  const ledgerResult = await query(
    `SELECT event_hash FROM ledger_events
     WHERE source_table = 'contributions' AND source_id = $1
       AND event_kind = 'CONTRIBUTION_RECEIVED'
     ORDER BY sequence_number ASC LIMIT 1`,
    [contribution_id]
  );

  return buildPublicReceiptDTO(
    contribution,
    allocResult.rows,
    activityResult.rows,
    ledgerResult.rows[0] ?? null
  );
}

export async function getPublicDashboard(organisationId) {
  const org = await query(
    `SELECT id, name, organisation_type, status FROM organisations WHERE id = $1`, [organisationId]
  );
  if (!org.rows.length) throw Object.assign(new Error('Organisation not found.'), { status: 404 });

  // Financial aggregates (allowlisted — no PII)
  const financial = await query(
    `SELECT
       COUNT(*) AS total_contributions,
       SUM(amount) AS total_received,
       currency,
       COUNT(*) FILTER (WHERE status = 'REVERSED') AS reversed_count
     FROM contributions
     WHERE organisation_id = $1 AND status <> 'REVERSED'
     GROUP BY currency`,
    [organisationId]
  );

  const disbursements = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'PAID') AS total_paid_count,
       SUM(amount) FILTER (WHERE status = 'PAID') AS total_disbursed,
       currency
     FROM disbursements
     WHERE organisation_id = $1
     GROUP BY currency`,
    [organisationId]
  );

  // Impact metrics
  const impact = await query(
    `SELECT
       COUNT(*) AS total_activities,
       COUNT(*) FILTER (WHERE impact_state = 'VERIFIED') AS verified_activities,
       COUNT(*) FILTER (WHERE impact_state = 'PENDING_REVIEW') AS pending_review,
       COUNT(*) FILTER (WHERE impact_state = 'REJECTED') AS rejected_activities
     FROM activity_events WHERE organisation_id = $1`,
    [organisationId]
  );

  return {
    organisation: org.rows[0],
    financial_summary: financial.rows,
    disbursement_summary: disbursements.rows,
    impact_summary: impact.rows[0] ?? {},
  };
}
