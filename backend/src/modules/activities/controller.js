/**
 * activities/controller.js
 */
import * as svc from './service.js';
import {
  createActivitySchema, addEvidenceSchema, updateEvidenceScanSchema,
  createAttestationSchema, createDisputeSchema, resolveDisputeSchema,
} from './schema.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map(e => e.message).join('; '));
    err.status = 422; throw err;
  }
  return result.data;
}

// Activities
export async function createActivity(req, res, next) {
  try {
    const data = parse(createActivitySchema, req.body);
    res.status(201).json(await svc.createActivity(req.orgContext.organisation_id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function listActivities(req, res, next) {
  try {
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    res.json(await svc.listActivities(req.orgContext.organisation_id, { page, limit }));
  } catch (err) { next(err); }
}
export async function getActivity(req, res, next) {
  try { res.json(await svc.getActivity(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

// Evidence
export async function addEvidence(req, res, next) {
  try {
    const data = parse(addEvidenceSchema, req.body);
    res.status(201).json(await svc.addEvidence(req.orgContext.organisation_id, req.params.id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function listEvidence(req, res, next) {
  try { res.json(await svc.listEvidence(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}
export async function updateEvidenceScan(req, res, next) {
  try {
    const data = parse(updateEvidenceScanSchema, req.body);
    res.json(await svc.updateEvidenceScan(req.orgContext.organisation_id, req.params.id, req.params.evidenceId, data));
  } catch (err) { next(err); }
}

// Attestations
export async function createAttestation(req, res, next) {
  try {
    const data = parse(createAttestationSchema, req.body);
    res.status(201).json(await svc.createAttestation(req.orgContext.organisation_id, req.params.id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function listAttestations(req, res, next) {
  try { res.json(await svc.listAttestations(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

// Disputes
export async function createDispute(req, res, next) {
  try {
    const data = parse(createDisputeSchema, req.body);
    res.status(201).json(await svc.createDispute(req.orgContext.organisation_id, req.params.id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function resolveDispute(req, res, next) {
  try {
    const data = parse(resolveDisputeSchema, req.body);
    res.json(await svc.resolveDispute(req.orgContext.organisation_id, req.params.id, req.params.disputeId, data));
  } catch (err) { next(err); }
}
