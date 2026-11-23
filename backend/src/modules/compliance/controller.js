/**
 * compliance/controller.js
 */
import * as svc from './service.js';
import {
  createAgreementSchema, verifyAgreementSchema, createComplianceRuleSchema,
  createDisbursementSchema, approveDisbursementSchema, payDisbursementSchema,
} from './schema.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map(e => e.message).join('; '));
    err.status = 422; throw err;
  }
  return result.data;
}

// Agreements
export async function createAgreement(req, res, next) {
  try { res.status(201).json(await svc.createAgreement(req.orgContext.organisation_id, parse(createAgreementSchema, req.body))); }
  catch (err) { next(err); }
}
export async function listAgreements(req, res, next) {
  try { res.json(await svc.listAgreements(req.orgContext.organisation_id)); }
  catch (err) { next(err); }
}
export async function getAgreement(req, res, next) {
  try { res.json(await svc.getAgreement(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}
export async function verifyAgreement(req, res, next) {
  try { res.json(await svc.verifyAgreement(req.orgContext.organisation_id, req.params.id, parse(verifyAgreementSchema, req.body))); }
  catch (err) { next(err); }
}

// Compliance rules (platform-global)
export async function createComplianceRule(req, res, next) {
  try { res.status(201).json(await svc.createComplianceRule(parse(createComplianceRuleSchema, req.body))); }
  catch (err) { next(err); }
}
export async function listComplianceRules(req, res, next) {
  try { res.json(await svc.listComplianceRules()); }
  catch (err) { next(err); }
}

// Disbursements
export async function createDisbursement(req, res, next) {
  try {
    const data = parse(createDisbursementSchema, req.body);
    res.status(201).json(await svc.createDisbursement(req.orgContext.organisation_id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function listDisbursements(req, res, next) {
  try {
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    res.json(await svc.listDisbursements(req.orgContext.organisation_id, { page, limit }));
  } catch (err) { next(err); }
}
export async function getDisbursement(req, res, next) {
  try { res.json(await svc.getDisbursement(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}
export async function submitDisbursement(req, res, next) {
  try { res.json(await svc.submitDisbursement(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}
export async function approveDisbursement(req, res, next) {
  try {
    const data = parse(approveDisbursementSchema, req.body);
    res.json(await svc.approveDisbursement(req.orgContext.organisation_id, req.params.id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function payDisbursement(req, res, next) {
  try {
    const data = parse(payDisbursementSchema, req.body);
    res.json(await svc.payDisbursement(req.orgContext.organisation_id, req.params.id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function evaluateCompliance(req, res, next) {
  try { res.json(await svc.evaluateCompliance(req.orgContext.organisation_id, req.user.id)); }
  catch (err) { next(err); }
}
