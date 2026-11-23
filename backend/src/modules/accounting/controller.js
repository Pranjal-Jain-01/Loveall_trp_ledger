/**
 * accounting/controller.js
 */
import * as svc from './service.js';
import { createAccountSchema, createJournalEntrySchema } from './schema.js';

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const err = new Error(result.error.errors.map(e => e.message).join('; '));
    err.status = 422; throw err;
  }
  return result.data;
}

// Chart of Accounts
export async function createAccount(req, res, next) {
  try {
    res.status(201).json(await svc.createAccount(req.orgContext.organisation_id, parse(createAccountSchema, req.body)));
  } catch (err) { next(err); }
}
export async function listAccounts(req, res, next) {
  try { res.json(await svc.listAccounts(req.orgContext.organisation_id)); }
  catch (err) { next(err); }
}
export async function getAccount(req, res, next) {
  try { res.json(await svc.getAccount(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}

// Journal Entries
export async function createJournalEntry(req, res, next) {
  try {
    const data = parse(createJournalEntrySchema, req.body);
    res.status(201).json(await svc.createJournalEntry(req.orgContext.organisation_id, req.user.id, data));
  } catch (err) { next(err); }
}
export async function listJournalEntries(req, res, next) {
  try {
    const page = parseInt(req.query.page ?? '1', 10);
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10), 100);
    res.json(await svc.listJournalEntries(req.orgContext.organisation_id, { page, limit }));
  } catch (err) { next(err); }
}
export async function getJournalEntry(req, res, next) {
  try { res.json(await svc.getJournalEntry(req.orgContext.organisation_id, req.params.id)); }
  catch (err) { next(err); }
}
export async function postJournalEntry(req, res, next) {
  try { res.json(await svc.postJournalEntry(req.orgContext.organisation_id, req.params.id, req.user.id)); }
  catch (err) { next(err); }
}
export async function reverseJournalEntry(req, res, next) {
  try { res.json(await svc.reverseJournalEntry(req.orgContext.organisation_id, req.params.id, req.user.id)); }
  catch (err) { next(err); }
}
