/**
 * ER-03: Conditional Release Requires VERIFIED Agreement
 *
 * trg_conditional_release_agreement raises P0001 when conditional_release=TRUE
 * is set on a disbursement but the linked funding_agreement is not VERIFIED.
 *
 * funding_agreements.status type: verification_status
 *   Valid values: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED'
 *   ('DRAFT' is NOT a valid value — it's for journal_entry_status, not verification_status)
 *
 * Trigger logic:
 *   Fires if conditional_release=TRUE and either:
 *     - funding_agreement_id IS NULL, OR
 *     - conditional_disbursement_allowed = FALSE, OR
 *     - status <> 'VERIFIED'
 *
 * So we insert a 'PENDING' agreement with conditional_disbursement_allowed=TRUE
 * → trigger sees status <> 'VERIFIED' → raises P0001.
 */
import request from 'supertest';
import app from '../../src/app.js';

const DB_AVAILABLE = !!process.env.DATABASE_URL;

describe('ER-03 — Conditional Release Agreement Verification', () => {
  test('App is an express instance (always passes)', () => {
    expect(typeof app).toBe('function');
  });

  test('DB trigger blocks conditional_release=TRUE on PENDING agreement with P0001', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping ER-03 DB test: DATABASE_URL not set');
      return;
    }
    const { query } = await import('../../src/config/db.js');
    try {
      const orgRes = await query(`SELECT id FROM organisations ORDER BY created_at LIMIT 1`);
      if (!orgRes.rows.length) {
        console.warn('⚠️  No organisations found — skipping ER-03 trigger test');
        return;
      }
      const orgId = orgRes.rows[0].id;

      const poolRes = await query(
        `SELECT id FROM fund_pools WHERE organisation_id = $1 LIMIT 1`,
        [orgId]
      );
      if (!poolRes.rows.length) {
        console.warn('⚠️  No fund pool found — skipping ER-03 trigger test');
        return;
      }

      // Create a PENDING agreement with conditional_disbursement_allowed=TRUE.
      // Status 'PENDING' is a valid verification_status enum value (unlike 'DRAFT').
      // The trigger requires status = 'VERIFIED' to allow conditional_release, so
      // inserting a disbursement against this PENDING agreement must raise P0001.
      const agRes = await query(
        `INSERT INTO funding_agreements
           (implementing_organisation_id, agreement_code,
            status, conditional_disbursement_allowed)
         VALUES ($1, 'FA-TEST-ER03-PENDING', 'PENDING', TRUE)
         ON CONFLICT (agreement_code)
           DO UPDATE SET status = 'PENDING', conditional_disbursement_allowed = TRUE
         RETURNING id`,
        [orgId]
      );

      await query(
        `INSERT INTO disbursements
           (organisation_id, fund_pool_id, funding_agreement_id,
            conditional_release, recipient_kind, amount, currency, status)
         VALUES ($1, $2, $3, TRUE, 'VENDOR', 500, 'INR', 'DRAFT')`,
        [orgId, poolRes.rows[0].id, agRes.rows[0].id]
      );
      throw new Error('Expected trigger P0001 for conditional_release on PENDING agreement');
    } catch (err) {
      expect(err.code).toBe('P0001');
    }
  });

  test('POST /agreements is accessible (returns 401 without auth)', async () => {
    const res = await request(app)
      .post('/api/v1/agreements')
      .send({ agreement_code: 'FA-TEST-001' });
    expect(res.status).toBe(401);
  });

  test('GET /agreements/:id/verify route exists (returns 401 without auth)', async () => {
    const res = await request(app)
      .patch('/api/v1/agreements/00000000-0000-0000-0000-000000000000/verify')
      .send({ status: 'VERIFIED' });
    expect(res.status).toBe(401);
  });
});
