/**
 * ledger/controller.js
 */
import * as svc from './service.js';
import { createSigningKeySchema, createBatchSchema } from './schema.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map(e => e.message).join('; '));
    err.status = 422; throw err;
  }
  return result.data;
}

export async function createSigningKey(req, res, next) {
  try {
    res.status(201).json(await svc.createSigningKey(req.orgContext.organisation_id, parse(createSigningKeySchema, req.body)));
  } catch (err) { next(err); }
}
export async function listSigningKeys(req, res, next) {
  try { res.json(await svc.listSigningKeys(req.orgContext.organisation_id)); }
  catch (err) { next(err); }
}
export async function revokeSigningKey(req, res, next) {
  try { res.json(await svc.revokeSigningKey(req.orgContext.organisation_id, req.params.keyId)); }
  catch (err) { next(err); }
}

export async function listLedgerEvents(req, res, next) {
  try {
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);
    res.json(await svc.listLedgerEvents(req.orgContext.organisation_id, { page, limit }));
  } catch (err) { next(err); }
}
export async function getLedgerEvent(req, res, next) {
  try { res.json(await svc.getLedgerEvent(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

export async function verifyChain(req, res, next) {
  try { res.json(await svc.verifyChain(req.orgContext.organisation_id)); }
  catch (err) { next(err); }
}

export async function createBatch(req, res, next) {
  try {
    const data = parse(createBatchSchema, req.body);
    res.status(201).json(await svc.createBatch(req.orgContext.organisation_id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function listBatches(req, res, next) {
  try { res.json(await svc.listBatches(req.orgContext.organisation_id)); }
  catch (err) { next(err); }
}
