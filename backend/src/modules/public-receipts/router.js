/**
 * public-receipts/router.js — paths relative to /api/v1
 * Public unauthenticated endpoints with strict rate limiting.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from './controller.js';

const router = Router();

const receiptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many receipt requests. Please try again later.' },
});

const dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// ER-09: token-based public receipt (allowlisted DTO, zero donor PII)
router.get('/public/receipts/:rawToken', receiptLimiter, ctrl.publicReceipt);
router.get('/public/dashboard/:organisationId', dashboardLimiter, ctrl.publicDashboard);

export default router;
