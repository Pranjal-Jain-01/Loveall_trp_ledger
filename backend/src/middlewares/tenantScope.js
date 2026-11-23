import { query } from '../config/db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * requireTenantScope / tenantScope:
 * Reads x-organisation-id header, validates UUID format, verifies an active
 * membership for req.user.id, and attaches req.orgContext = { organisation_id, role }.
 *
 * Returns 400 for a malformed UUID (prevents pg error 22P02 bubbling as 500).
 * Returns 403 for missing header or no active membership.
 */
export async function requireTenantScope(req, res, next) {
  try {
    const organisationId = req.headers['x-organisation-id'];
    if (!organisationId) {
      return res.status(403).json({ error: 'Missing x-organisation-id header.' });
    }
    // Validate UUID format before hitting PostgreSQL — avoids 22P02 → 500 crash
    if (!UUID_RE.test(organisationId)) {
      return res.status(400).json({ error: 'Invalid organisation UUID format.' });
    }
    const result = await query(
      `SELECT organisation_id, role FROM organisation_memberships
       WHERE organisation_id = $1 AND user_id = $2 AND is_active = TRUE`,
      [organisationId, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(403).json({ error: 'No active membership in this organisation.' });
    }
    req.orgContext = {
      organisation_id: result.rows[0].organisation_id,
      role: result.rows[0].role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

// Alias — routers may import by either name
export const tenantScope = requireTenantScope;
