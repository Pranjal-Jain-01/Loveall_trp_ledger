import { query } from '../config/db.js';

/**
 * writeAuditLog — fire-and-forget, never throws.
 * @param {Object} entry
 * @param {string}  entry.organisation_id
 * @param {string}  entry.actor_user_id
 * @param {string}  entry.action         e.g. 'POST /contributions'
 * @param {string}  entry.resource_type  e.g. 'contributions'
 * @param {string}  [entry.resource_id]
 * @param {'SUCCESS'|'DENIED'|'ERROR'} entry.outcome
 * @param {string}  [entry.request_id]
 * @param {string}  [entry.ip_address]
 * @param {Object}  [entry.metadata]
 */
export function writeAuditLog(entry) {
  const {
    organisation_id = null,
    actor_user_id = null,
    action,
    resource_type,
    resource_id = null,
    outcome,
    request_id = null,
    ip_address = null,
    metadata = {},
  } = entry;

  // Fire-and-forget: intentionally not awaited
  query(
    `INSERT INTO access_audit_log
       (organisation_id, actor_user_id, action, resource_type, resource_id,
        outcome, request_id, ip_address, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::inet,$9)`,
    [
      organisation_id,
      actor_user_id,
      action,
      resource_type,
      resource_id,
      outcome,
      request_id,
      ip_address,
      JSON.stringify(metadata),
    ]
  ).catch((err) => {
    console.error('[audit] Failed to write audit log entry:', err.message);
  });
}

/**
 * HTTP-level audit middleware — attaches helpers to res.locals.
 */
export function auditMiddleware(req, res, next) {
  res.locals.audit = (resource_type, resource_id, outcome, metadata = {}) => {
    writeAuditLog({
      organisation_id: req.orgContext?.organisation_id ?? null,
      actor_user_id: req.user?.id ?? null,
      action: `${req.method} ${req.path}`,
      resource_type,
      resource_id,
      outcome,
      request_id: req.headers['x-request-id'] ?? null,
      ip_address: req.ip,
      metadata,
    });
  };
  next();
}
