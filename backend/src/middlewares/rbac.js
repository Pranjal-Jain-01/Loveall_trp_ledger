export const ROLES = {
  ORG_ADMIN: 'ORG_ADMIN',
  FINANCE_OFFICER: 'FINANCE_OFFICER',
  FIELD_WORKER: 'FIELD_WORKER',
  SUPERVISOR: 'SUPERVISOR',
  INDEPENDENT_VERIFIER: 'INDEPENDENT_VERIFIER',
  AUDITOR: 'AUDITOR',
};

/**
 * requireRole(...roles) — middleware factory.
 * Returns 403 if req.orgContext.role is not in the allowed list.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.orgContext) {
      return res.status(403).json({ error: 'Organisation context required.' });
    }
    if (!roles.includes(req.orgContext.role)) {
      return res.status(403).json({
        error: `Role '${req.orgContext.role}' is not permitted for this action. Required: ${roles.join(', ')}.`,
      });
    }
    next();
  };
}
