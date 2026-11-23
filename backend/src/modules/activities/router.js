/**
 * activities/router.js — paths relative to /api/v1
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import { tenantScope } from '../../middlewares/tenantScope.js';
import * as ctrl from './controller.js';

const router = Router();
const auth = [requireAuth, tenantScope];
const fieldWorker = [...auth, requireRole('ORG_ADMIN', 'FINANCE_OFFICER', 'FIELD_WORKER', 'SUPERVISOR', 'INDEPENDENT_VERIFIER')];
const verifierOnly = [...auth, requireRole('ORG_ADMIN', 'SUPERVISOR', 'INDEPENDENT_VERIFIER')];
const scanAdmin = [...auth, requireRole('ORG_ADMIN', 'SUPERVISOR')];

// Activities
router.get('/activities', ...auth, ctrl.listActivities);
router.post('/activities', ...fieldWorker, ctrl.createActivity);
router.get('/activities/:id', ...auth, ctrl.getActivity);

// Evidence files
router.get('/activities/:id/evidence', ...auth, ctrl.listEvidence);
router.post('/activities/:id/evidence', ...fieldWorker, ctrl.addEvidence);
router.patch('/activities/:id/evidence/:evidenceId/scan', ...scanAdmin, ctrl.updateEvidenceScan);

// Attestations (ER-05, ER-06)
router.get('/activities/:id/attestations', ...auth, ctrl.listAttestations);
router.post('/activities/:id/attestations', ...verifierOnly, ctrl.createAttestation);

// Disputes
router.post('/activities/:id/disputes', ...auth, ctrl.createDispute);
router.patch('/activities/:id/disputes/:disputeId/resolve', ...verifierOnly, ctrl.resolveDispute);

export default router;
