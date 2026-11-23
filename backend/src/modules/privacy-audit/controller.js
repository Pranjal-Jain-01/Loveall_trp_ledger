/**
 * privacy-audit/controller.js
 */
import * as svc from './service.js';
import { createDsrSchema, updateDsrSchema } from './schema.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map(e => e.message).join('; '));
    err.status = 422; throw err;
  }
  return result.data;
}

// DSR endpoints
export async function createDsr(req, res, next) {
  try {
    const data = parse(createDsrSchema, req.body);
    res.status(201).json(await svc.createDsr(req.orgContext.organisation_id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function listDsrs(req, res, next) {
  try {
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    res.json(await svc.listDsrs(req.orgContext.organisation_id, { page, limit }));
  } catch (err) { next(err); }
}
export async function getDsr(req, res, next) {
  try { res.json(await svc.getDsr(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}
export async function updateDsr(req, res, next) {
  try {
    const data = parse(updateDsrSchema, req.body);
    res.json(await svc.updateDsr(req.orgContext.organisation_id, req.params.id, data));
  } catch (err) { next(err); }
}

// Audit log
export async function listAuditLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);
    const { actor_user_id, resource_type, outcome } = req.query;
    res.json(await svc.listAuditLogs(req.orgContext.organisation_id, {
      page, limit,
      actor_user_id: actor_user_id || undefined,
      resource_type: resource_type || undefined,
      outcome: outcome || undefined,
    }));
  } catch (err) { next(err); }
}
