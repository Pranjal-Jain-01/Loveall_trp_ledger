/**
 * ER-02: FOREIGN fund pool → PARTNER_NGO disbursement blocked
 *
 * trg_block_foreign_partner_transfer raises P0001 when a disbursement
 * targets a FOREIGN source_origin fund_pool with recipient_kind = 'PARTNER_NGO'.
 *
 * Schema columns (disbursements):
 *   organisation_id, fund_pool_id, recipient_kind, recipient_organisation_id,
 *   amount, currency, status, proposed_by
 * Note: recipient_organisation_id is NOT NULL when recipient_kind = 'PARTNER_NGO'
 *       (enforced by a CHECK constraint on the table).
 */
import request from 'supertest';
import app from '../../src/app.js';

const DB_AVAILABLE = !!process.env.DATABASE_URL;

describe('ER-02 — Foreign-to-Partner Disbursement Block', () => {
  test('Express app resolves (always passes)', () => {
    expect(typeof app).toBe('function');
  });

  test('DB trigger blocks FOREIGN→PARTNER_NGO disbursement with P0001', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping ER-02 DB test: DATABASE_URL not set');
      return;
    }
    const { query } = await import('../../src/config/db.js');

    // Pick any two distinct orgs — one is the acting org, one is the recipient NGO
    const orgRes = await query(`SELECT id FROM organisations ORDER BY created_at LIMIT 2`);
    if (orgRes.rows.length < 2) {
      console.warn('⚠️  Need at least 2 organisations — skipping ER-02 trigger test');
      return;
    }
    const actingOrg   = orgRes.rows[0].id;
    const recipientOrg = orgRes.rows[1].id;

    // Find a FOREIGN fund pool belonging to the acting org
    const poolRes = await query(
      `SELECT fp.id FROM fund_pools fp
       WHERE fp.source_origin = 'FOREIGN' AND fp.organisation_id = $1
       LIMIT 1`,
      [actingOrg]
    );
    if (!poolRes.rows.length) {
      console.warn('⚠️  No FOREIGN fund pool found — skipping direct trigger test');
      return;
    }

    // Find any user to use as proposed_by
    const userRes = await query(`SELECT id FROM users LIMIT 1`);

    try {
      // INSERT with correct schema columns:
      //   proposed_by replaces the old (wrong) created_by column
      //   recipient_organisation_id is required by the CHECK when recipient_kind='PARTNER_NGO'
      await query(
        `INSERT INTO disbursements
           (organisation_id, fund_pool_id, recipient_kind, recipient_organisation_id,
            amount, currency, status, proposed_by)
         VALUES ($1, $2, 'PARTNER_NGO', $3, 1000, 'USD', 'DRAFT', $4)`,
        [actingOrg, poolRes.rows[0].id, recipientOrg, userRes.rows[0]?.id ?? actingOrg]
      );
      throw new Error('Expected trigger P0001 to block FOREIGN→PARTNER_NGO disbursement');
    } catch (err) {
      expect(err.code).toBe('P0001');
    }
  });

  test('POST /disbursements requires auth (401 without token)', async () => {
    const res = await request(app)
      .post('/api/v1/disbursements')
      .send({ fund_pool_id: '00000000-0000-0000-0000-000000000000', recipient_kind: 'PARTNER_NGO', amount: 100 });
    expect(res.status).toBe(401);
  });

  test('GET /disbursements returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/disbursements');
    expect(res.status).toBe(401);
  });
});
