/**
 * app.js — Rewritten to mount all routers at /api/v1 with flat routing.
 * Each module router defines its own full sub-paths relative to /api/v1.
 */
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { auditMiddleware } from './middlewares/auditLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';

import authOrgRouter from './modules/auth-org/router.js';
import contributionsRouter from './modules/contributions/router.js';
import accountingRouter from './modules/accounting/router.js';
import complianceRouter from './modules/compliance/router.js';
import activitiesRouter from './modules/activities/router.js';
import ledgerRouter from './modules/ledger/router.js';
import publicReceiptsRouter from './modules/public-receipts/router.js';
import privacyAuditRouter from './modules/privacy-audit/router.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean),
  credentials: true,
}));
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
}));

// Parsing & logging
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(auditMiddleware);

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// API v1 — all module routers mounted at /api/v1
// Each router defines its own full sub-paths (e.g., router.get('/contributions', ...))
const API = '/api/v1';
app.use(API, authOrgRouter);
app.use(API, contributionsRouter);
app.use(API, accountingRouter);
app.use(API, complianceRouter);
app.use(API, activitiesRouter);
app.use(API, ledgerRouter);
app.use(API, publicReceiptsRouter);
app.use(API, privacyAuditRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// Error handler (last)
app.use(errorHandler);

export default app;
