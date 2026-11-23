/**
 * auth-org/controller.js
 * Thin HTTP layer — parse, delegate to service, respond.
 */
import * as svc from './service.js';
import {
  registerSchema, loginSchema, createOrgSchema,
  createMembershipSchema, createRegistrationSchema, verifyRegistrationSchema,
} from './schema.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map(e => e.message).join('; '));
    err.status = 422;
    throw err;
  }
  return result.data;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function register(req, res, next) {
  try {
    const data = parse(registerSchema, req.body);
    const result = await svc.register(data);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const data = parse(loginSchema, req.body);
    const result = await svc.login(data);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getMe(req, res, next) {
  try {
    const user = await svc.getMe(req.user.id);
    res.json(user);
  } catch (err) { next(err); }
}

// ─── Organisations ─────────────────────────────────────────────────────────

export async function createOrganisation(req, res, next) {
  try {
    const data = parse(createOrgSchema, req.body);
    const org = await svc.createOrganisation(data, req.user.id);
    res.status(201).json(org);
  } catch (err) { next(err); }
}

export async function getOrganisation(req, res, next) {
  try {
    const org = await svc.getOrganisation(req.orgContext.organisation_id);
    res.json(org);
  } catch (err) { next(err); }
}

// ─── Memberships ───────────────────────────────────────────────────────────

export async function addMembership(req, res, next) {
  try {
    const data = parse(createMembershipSchema, req.body);
    const membership = await svc.addMembership(req.orgContext.organisation_id, data);
    res.status(201).json(membership);
  } catch (err) { next(err); }
}

export async function getMemberships(req, res, next) {
  try {
    const memberships = await svc.getMemberships(req.orgContext.organisation_id);
    res.json(memberships);
  } catch (err) { next(err); }
}

export async function deactivateMembership(req, res, next) {
  try {
    const result = await svc.deactivateMembership(req.orgContext.organisation_id, req.params.userId);
    res.json(result);
  } catch (err) { next(err); }
}

// ─── Registrations ─────────────────────────────────────────────────────────

export async function createRegistration(req, res, next) {
  try {
    const data = parse(createRegistrationSchema, req.body);
    const reg = await svc.createRegistration(req.orgContext.organisation_id, data);
    res.status(201).json(reg);
  } catch (err) { next(err); }
}

export async function getRegistrations(req, res, next) {
  try {
    const regs = await svc.getRegistrations(req.orgContext.organisation_id);
    res.json(regs);
  } catch (err) { next(err); }
}

export async function verifyRegistration(req, res, next) {
  try {
    const data = parse(verifyRegistrationSchema, req.body);
    const reg = await svc.verifyRegistration(req.orgContext.organisation_id, req.params.regId, data);
    res.json(reg);
  } catch (err) { next(err); }
}
