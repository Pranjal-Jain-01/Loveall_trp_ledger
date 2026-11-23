/**
 * contributions/controller.js
 */
import * as svc from './service.js';
import {
  createProgrammeSchema, createFundPoolSchema, createContributionSchema,
  reclassifySchema, createAllocationSchema, taxAssessmentSchema,
} from './schema.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map(e => e.message).join('; '));
    err.status = 422; throw err;
  }
  return result.data;
}

// ─── Programmes ────────────────────────────────────────────────────────────

export async function createProgramme(req, res, next) {
  try {
    const data = parse(createProgrammeSchema, req.body);
    res.status(201).json(await svc.createProgramme(req.orgContext.organisation_id, data));
  } catch (err) { next(err); }
}

export async function listProgrammes(req, res, next) {
  try { res.json(await svc.listProgrammes(req.orgContext.organisation_id)); }
  catch (err) { next(err); }
}

export async function getProgramme(req, res, next) {
  try { res.json(await svc.getProgramme(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

// ─── Fund Pools ────────────────────────────────────────────────────────────

export async function createFundPool(req, res, next) {
  try {
    const data = parse(createFundPoolSchema, req.body);
    res.status(201).json(await svc.createFundPool(req.orgContext.organisation_id, data));
  } catch (err) { next(err); }
}

export async function listFundPools(req, res, next) {
  try { res.json(await svc.listFundPools(req.orgContext.organisation_id)); }
  catch (err) { next(err); }
}

export async function getFundPool(req, res, next) {
  try { res.json(await svc.getFundPool(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

// ─── Contributions ─────────────────────────────────────────────────────────

export async function createContribution(req, res, next) {
  try {
    const data = parse(createContributionSchema, req.body);
    const result = await svc.createContribution(req.orgContext.organisation_id, req.user.id, data);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function listContributions(req, res, next) {
  try {
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    res.json(await svc.listContributions(req.orgContext.organisation_id, { page, limit }));
  } catch (err) { next(err); }
}

export async function getContribution(req, res, next) {
  try { res.json(await svc.getContribution(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

export async function reverseAndReclassify(req, res, next) {
  try {
    const data = parse(reclassifySchema, req.body);
    res.json(await svc.reverseAndReclassify(req.orgContext.organisation_id, req.params.id, req.user.id, data));
  } catch (err) { next(err); }
}

// ─── Allocations ───────────────────────────────────────────────────────────

export async function createAllocation(req, res, next) {
  try {
    const data = parse(createAllocationSchema, req.body);
    res.status(201).json(await svc.createAllocation(req.orgContext.organisation_id, req.params.id, req.user.id, data));
  } catch (err) { next(err); }
}

export async function listAllocations(req, res, next) {
  try { res.json(await svc.listAllocations(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

// ─── Tax Assessments ───────────────────────────────────────────────────────

export async function upsertTaxAssessment(req, res, next) {
  try {
    const data = parse(taxAssessmentSchema, req.body);
    res.json(await svc.upsertTaxAssessment(req.orgContext.organisation_id, req.params.id, data));
  } catch (err) { next(err); }
}

export async function getTaxAssessment(req, res, next) {
  try { res.json(await svc.getTaxAssessment(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}
