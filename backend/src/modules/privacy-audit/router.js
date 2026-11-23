/**
 * privacy-audit/router.js — paths relative to /api/v1
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import { tenantScope } from '../../middlewares/tenantScope.js';
import * as ctrl from './controller.js';

const router = Router();
const auth = [requireAuth, tenantScope];
const adminOnly = [...auth, requireRole('ORG_ADMIN')];

// DSR — any authenticated member can file; ORG_ADMIN manages
router.post('/privacy/dsrs', ...auth, ctrl.createDsr);
router.get('/privacy/dsrs', ...adminOnly, ctrl.listDsrs);
router.get('/privacy/dsrs/:id', ...adminOnly, ctrl.getDsr);
router.patch('/privacy/dsrs/:id', ...adminOnly, ctrl.updateDsr);

// Audit logs — ORG_ADMIN + AUDITOR can read
router.get('/audit-logs', ...auth, requireRole('ORG_ADMIN', 'AUDITOR'), ctrl.listAuditLogs);

export default router;
