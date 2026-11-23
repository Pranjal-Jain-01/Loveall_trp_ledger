/**
 * ledger/router.js — paths relative to /api/v1
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import { tenantScope } from '../../middlewares/tenantScope.js';
import * as ctrl from './controller.js';

const router = Router();
const auth = [requireAuth, tenantScope];
const adminOnly = [...auth, requireRole('ORG_ADMIN')];
const auditorOk = [...auth, requireRole('ORG_ADMIN', 'AUDITOR')];

// Signing keys
router.get('/ledger/keys', ...adminOnly, ctrl.listSigningKeys);
router.post('/ledger/keys', ...adminOnly, ctrl.createSigningKey);
router.patch('/ledger/keys/:keyId/revoke', ...adminOnly, ctrl.revokeSigningKey);

// Ledger events
router.get('/ledger/events', ...auditorOk, ctrl.listLedgerEvents);
router.get('/ledger/events/:id', ...auditorOk, ctrl.getLedgerEvent);

// Chain verification (ER-07)
router.get('/ledger/verify-chain', ...auditorOk, ctrl.verifyChain);

// Ledger batches
router.get('/ledger/batches', ...auditorOk, ctrl.listBatches);
router.post('/ledger/batches', ...adminOnly, ctrl.createBatch);

export default router;
