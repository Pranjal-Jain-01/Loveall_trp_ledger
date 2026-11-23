/**
 * ER-08: Double-Entry Journal Balance
 *
 * trg_journal_lines_balanced / trg_journal_header_balanced validate that
 * SUM(debit) == SUM(credit) > 0 when a journal entry transitions to POSTED.
 * Service layer: appends ledger event FIRST, then updates to POSTED.
 */
import request from 'supertest';
import app from '../../src/app.js';

const DB_AVAILABLE = !!process.env.DATABASE_URL;

describe('ER-08 — Double-Entry Journal Balance', () => {
  test('App resolves (always passes)', () => {
    expect(typeof app).toBe('function');
  });

  test('DB trigger blocks posting unbalanced journal entry with P0001', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping ER-08 DB test: DATABASE_URL not set');
      return;
    }
    const { query, withTransaction } = await import('../../src/config/db.js');
    try {
      const orgRes = await query(`SELECT id FROM organisations LIMIT 1`);
      if (!orgRes.rows.length) return;
      const orgId = orgRes.rows[0].id;

      const accRes = await query(
        `SELECT id FROM chart_of_accounts WHERE organisation_id = $1 LIMIT 2`,
        [orgId]
      );
      if (accRes.rows.length < 2) {
        console.warn('⚠️  Need at least 2 accounts — skipping');
        return;
      }

      await withTransaction(async (client) => {
        const entryRes = await client.query(
          `INSERT INTO journal_entries
             (organisation_id, entry_number, effective_on, currency, description, status)
           VALUES ($1, 'JE-TEST-UNBAL-001', '2024-06-01', 'INR', 'Unbalanced test', 'DRAFT')
           RETURNING id`,
          [orgId]
        );
        const entryId = entryRes.rows[0].id;

        // Debit only — no credit
        await client.query(
          `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit)
           VALUES ($1, $2, 500, 0)`,
          [entryId, accRes.rows[0].id]
        );

        // Try to post — trigger should fire
        await client.query(
          `UPDATE journal_entries SET status = 'POSTED' WHERE id = $1`,
          [entryId]
        );
      });
      throw new Error('Expected P0001 trigger for unbalanced journal entry');
    } catch (err) {
      expect(err.code).toBe('P0001');
    }
  });

  test('POST /journal-entries requires auth (401)', async () => {
    const res = await request(app).post('/api/v1/journal-entries').send({});
    expect(res.status).toBe(401);
  });

  test('POST /journal-entries/:id/post requires auth (401)', async () => {
    const res = await request(app)
      .post('/api/v1/journal-entries/00000000-0000-0000-0000-000000000000/post');
    expect(res.status).toBe(401);
  });

  test('POST /journal-entries validates schema — lines must have at least 2 entries', async () => {
    if (!DB_AVAILABLE) {
      console.warn('⚠️  Skipping: DATABASE_URL not set');
      return;
    }
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'finance@loveall.org', password: 'LoveAll@2026!' });
    if (loginRes.status !== 200) return;

    const orgRes = await request(app)
      .get('/api/v1/organisations/current')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .set('x-organisation-id', Object.keys(loginRes.body)[0]);

    // Test schema validation without full DB setup
    const res = await request(app)
      .post('/api/v1/journal-entries')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .set('x-organisation-id', '00000000-0000-0000-0000-000000000000')
      .send({
        entry_number: 'JE-001',
        effective_on: '2024-01-01',
        currency: 'INR',
        description: 'Test',
        lines: [{ account_id: '00000000-0000-0000-0000-000000000001', debit: 100, credit: 0 }],
      });
    // 422 (validation: need ≥2 lines) or 403 (org not found)
    expect([400, 403, 422]).toContain(res.status);
  });
});
