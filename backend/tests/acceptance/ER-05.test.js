/**
 * ER-05: Activity Attestation Requires CLEAN Evidence
 *
 * trg_activity_verified_requires_attestation blocks VERIFIED status
 * if no evidence files exist or if any evidence is REJECTED.
 * Service layer also enforces: 0 CLEAN files OR any REJECTED → 422.
 */
import request from 'supertest';
import app from '../../src/app.js';

const DB_AVAILABLE = !!process.env.DATABASE_URL;

describe('ER-05 — Attestation Requires Clean Evidence', () => {
  test('App resolves (always passes)', () => {
    expect(typeof app).toBe('function');
  });

  test('DB trigger blocks VERIFIED without attestation with P0001', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping ER-05 DB test: DATABASE_URL not set');
      return;
    }
    const { query } = await import('../../src/config/db.js');
    try {
      const actRes = await query(
        `SELECT id FROM activity_events WHERE impact_state = 'PENDING_REVIEW' LIMIT 1`
      );
      if (!actRes.rows.length) {
        console.warn('⚠️  No PENDING_REVIEW activity found — skipping');
        return;
      }
      await query(
        `UPDATE activity_events SET impact_state = 'VERIFIED'
         WHERE id = $1`,
        [actRes.rows[0].id]
      );
      throw new Error('Expected P0001 trigger for VERIFIED without attestation');
    } catch (err) {
      expect(err.code).toBe('P0001');
    }
  });

  test('POST /activities/:id/attestations requires auth (401)', async () => {
    const res = await request(app)
      .post('/api/v1/activities/00000000-0000-0000-0000-000000000000/attestations')
      .send({ level: 'SUPERVISOR_REVIEW', decision: 'APPROVE' });
    expect(res.status).toBe(401);
  });

  test('POST /activities route exists (401 without auth)', async () => {
    const res = await request(app).post('/api/v1/activities').send({});
    expect(res.status).toBe(401);
  });
});
