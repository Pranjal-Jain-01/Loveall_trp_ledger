/**
 * public-receipts/controller.js
 * Wraps the existing service.js (ER-09 — allowlisted DTO, zero donor PII).
 */
import { getPublicReceipt, getPublicDashboard } from './service.js';

export async function publicReceipt(req, res, next) {
  try {
    const dto = await getPublicReceipt(req.params.rawToken);
    res.json(dto);
  } catch (err) { next(err); }
}

export async function publicDashboard(req, res, next) {
  try {
    const dto = await getPublicDashboard(req.params.organisationId);
    res.json(dto);
  } catch (err) { next(err); }
}
