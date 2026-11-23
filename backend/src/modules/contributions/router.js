/**
 * contributions/router.js — paths relative to /api/v1
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import { tenantScope } from '../../middlewares/tenantScope.js';
import * as ctrl from './controller.js';

const router = Router();
const auth = [requireAuth, tenantScope];
const financeOnly = [...auth, requireRole('ORG_ADMIN', 'FINANCE_OFFICER')];

// Programmes
router.get('/programmes', ...auth, ctrl.listProgrammes);
router.post('/programmes', ...financeOnly, ctrl.createProgramme);
router.get('/programmes/:id', ...auth, ctrl.getProgramme);

// Fund Pools
router.get('/fund-pools', ...auth, ctrl.listFundPools);
router.post('/fund-pools', ...financeOnly, ctrl.createFundPool);
router.get('/fund-pools/:id', ...auth, ctrl.getFundPool);

// Contributions
router.get('/contributions', ...auth, ctrl.listContributions);
router.post('/contributions', ...financeOnly, ctrl.createContribution);
router.get('/contributions/:id', ...auth, ctrl.getContribution);
router.post('/contributions/:id/reverse-and-reclassify', ...financeOnly, ctrl.reverseAndReclassify);

// Allocations (ER-04)
router.get('/contributions/:id/allocations', ...auth, ctrl.listAllocations);
router.post('/contributions/:id/allocations', ...financeOnly, ctrl.createAllocation);

// Tax assessment
router.get('/contributions/:id/tax-assessment', ...auth, ctrl.getTaxAssessment);
router.put('/contributions/:id/tax-assessment', ...financeOnly, ctrl.upsertTaxAssessment);

export default router;
