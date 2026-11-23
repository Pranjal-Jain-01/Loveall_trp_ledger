/**
 * compliance/router.js — paths relative to /api/v1
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import { tenantScope } from '../../middlewares/tenantScope.js';
import * as ctrl from './controller.js';

const router = Router();
const auth = [requireAuth, tenantScope];
const financeOnly = [...auth, requireRole('ORG_ADMIN', 'FINANCE_OFFICER')];
const adminOnly = [...auth, requireRole('ORG_ADMIN')];

// Funding agreements
router.get('/agreements', ...auth, ctrl.listAgreements);
router.post('/agreements', ...financeOnly, ctrl.createAgreement);
router.get('/agreements/:id', ...auth, ctrl.getAgreement);
router.patch('/agreements/:id/verify', ...adminOnly, ctrl.verifyAgreement);

// Compliance rules (platform-global — read by any authenticated; write by ORG_ADMIN)
router.get('/compliance-rules', requireAuth, ctrl.listComplianceRules);
router.post('/compliance-rules', requireAuth, requireRole('ORG_ADMIN'), ctrl.createComplianceRule);

// Disbursements (ER-02, ER-03 enforced by DB triggers on INSERT)
router.get('/disbursements', ...auth, ctrl.listDisbursements);
router.post('/disbursements', ...financeOnly, ctrl.createDisbursement);
router.get('/disbursements/:id', ...auth, ctrl.getDisbursement);
router.post('/disbursements/:id/submit', ...financeOnly, ctrl.submitDisbursement);
router.post('/disbursements/:id/approve', ...adminOnly, ctrl.approveDisbursement);
router.post('/disbursements/:id/pay', ...financeOnly, ctrl.payDisbursement);

// Compliance evaluation
router.post('/compliance-checks/run', ...adminOnly, ctrl.evaluateCompliance);

export default router;
