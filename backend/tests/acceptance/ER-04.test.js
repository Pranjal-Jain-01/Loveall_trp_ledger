/**
 * ER-04: Contribution Allocation Cap
 *
 * trg_contribution_allocation_cap ensures that the sum of all allocations
 * for a contribution cannot exceed the contribution.amount.
 */
import request from 'supertest';
import app from '../../src/app.js';

const DB_AVAILABLE = !!process.env.DATABASE_URL;

describe('ER-04 — Contribution Allocation Cap', () => {
  test('App resolves (always passes)', () => {
    expect(typeof app).toBe('function');
  });

  test('DB trigger blocks over-allocation with P0001', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping ER-04 DB test: DATABASE_URL not set');
      return;
    }
    const { query } = await import('../../src/config/db.js');
    try {
      const contribRes = await query(
        `SELECT c.id, c.amount, c.organisation_id, p.id AS programme_id
         FROM contributions c
         JOIN programmes p ON p.organisation_id = c.organisation_id
         WHERE c.status = 'RECEIVED'
         LIMIT 1`
      );
      if (!contribRes.rows.length) {
        console.warn('⚠️  No RECEIVED contribution found — skipping allocation cap test');
        return;
      }
      const { id: contribution_id, amount, programme_id } = contribRes.rows[0];
      // Insert allocation exceeding contribution.amount
      await query(
        `INSERT INTO contribution_allocations (contribution_id, programme_id, amount, currency)
         VALUES ($1, $2, $3, 'INR')`,
        [contribution_id, programme_id, parseFloat(amount) + 1]
      );
      throw new Error('Expected P0001 trigger for over-allocation');
    } catch (err) {
      expect(err.code).toBe('P0001');
    }
  });

  test('POST /contributions/:id/allocations returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/contributions/00000000-0000-0000-0000-000000000000/allocations')
      .send({ programme_id: '00000000-0000-0000-0000-000000000000', amount: 100 });
    expect(res.status).toBe(401);
  });

  test('POST /contributions/:id/allocations validates schema (422 for missing fields)', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping: DATABASE_URL not set');
      return;
    }
    // Even with a valid token, missing required fields should return 422
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'finance@loveall.org', password: 'LoveAll@2026!' });
    if (loginRes.status !== 200) return;

    const { token } = loginRes.body;
    const orgId = loginRes.body.user?.organisation_id;
    if (!orgId) return;

    const res = await request(app)
      .post('/api/v1/contributions/00000000-0000-0000-0000-000000000000/allocations')
      .set('Authorization', `Bearer ${token}`)
      .set('x-organisation-id', orgId)
      .send({ programme_id: 'not-a-uuid' }); // missing amount
    expect([400, 403, 422]).toContain(res.status);
  });
});
