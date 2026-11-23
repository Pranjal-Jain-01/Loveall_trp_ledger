/**
 * ER-07: Ledger Append-Only + Chain Integrity
 *
 * trg_ledger_events_no_update blocks any UPDATE or DELETE on ledger_events.
 * GET /ledger/verify-chain recomputes hashes and verifies Ed25519 signatures.
 */
import request from 'supertest';
import app from '../../src/app.js';

const DB_AVAILABLE = !!process.env.DATABASE_URL;

describe('ER-07 — Ledger Append-Only and Chain Integrity', () => {
  test('App resolves (always passes)', () => {
    expect(typeof app).toBe('function');
  });

  test('DB trigger blocks UPDATE on ledger_events with P0001', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping ER-07 DB test: DATABASE_URL not set');
      return;
    }
    const { query } = await import('../../src/config/db.js');
    try {
      const evtRes = await query(`SELECT id FROM ledger_events LIMIT 1`);
      if (!evtRes.rows.length) {
        console.warn('⚠️  No ledger events found — skipping trigger test');
        return;
      }
      await query(
        `UPDATE ledger_events SET event_kind = 'OTHER' WHERE id = $1`,
        [evtRes.rows[0].id]
      );
      throw new Error('Expected P0001 trigger blocking ledger_events UPDATE');
    } catch (err) {
      expect(err.code).toBe('P0001');
    }
  });

  test('GET /ledger/events requires auth (401)', async () => {
    const res = await request(app).get('/api/v1/ledger/events');
    expect(res.status).toBe(401);
  });

  test('GET /ledger/verify-chain requires auth (401)', async () => {
    const res = await request(app).get('/api/v1/ledger/verify-chain');
    expect(res.status).toBe(401);
  });

  test('POST /ledger/keys requires auth (401)', async () => {
    const res = await request(app).post('/api/v1/ledger/keys').send({});
    expect(res.status).toBe(401);
  });

  test('verifyChain returns valid:true for empty org (no events)', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping ER-07 chain verify: DATABASE_URL not set');
      return;
    }
    const { verifyChain } = await import('../../src/modules/ledger/service.js');
    // Use a UUID that has no ledger events
    const result = await verifyChain('00000000-0000-0000-0000-000000000000');
    expect(result.total_events).toBe(0);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
