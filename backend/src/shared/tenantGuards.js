/**
 * tenantGuards.js — Cross-tenant ownership assertions
 *
 * Every service that writes a foreign-key reference must call assertSameOrganisation
 * before executing the write to prevent cross-tenant data leakage (ER-10).
 */
import { query as poolQuery } from '../config/db.js';

/**
 * Asserts that a record in `tableName` identified by `recordId` belongs to
 * `organisationId`. Throws a structured error (caught by errorHandler) if not.
 *
 * @param {import('pg').PoolClient | null} client  — pg PoolClient inside a transaction, or null to use pool
 * @param {string} tableName   — exact table name (must have organisation_id column)
 * @param {string} recordId    — UUID of the record to check
 * @param {string} organisationId — expected tenant organisation UUID
 */
export async function assertSameOrganisation(client, tableName, recordId, organisationId) {
  // Build a safe query — tableName is an internal constant, never user input
  const allowedTables = new Set([
    'fund_pools', 'programmes', 'activity_events',
    'disbursements', 'contributions', 'chart_of_accounts', 'journal_entries',
    'signing_keys', 'data_subject_requests',
  ]);
  if (!allowedTables.has(tableName)) {
    throw new Error(`assertSameOrganisation: table '${tableName}' is not in the allowed list.`);
  }
  const sql = `SELECT id FROM ${tableName} WHERE id = $1 AND organisation_id = $2`;
  // Use provided client (transaction) or fall back to pool
  const qFn = client ? (t, p) => client.query(t, p) : poolQuery;
  const result = await qFn(sql, [recordId, organisationId]);
  if (!result.rows.length) {
    const err = new Error(`Record '${recordId}' in '${tableName}' does not belong to this organisation or does not exist.`);
    err.status = 403;
    throw err;
  }
}
