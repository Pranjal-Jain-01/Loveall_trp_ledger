/**
 * auth-org/router.js — paths relative to /api/v1
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import { tenantScope } from '../../middlewares/tenantScope.js';
import * as ctrl from './controller.js';

const router = Router();

// Public auth
router.post('/auth/register', ctrl.register);
router.post('/auth/login', ctrl.login);

// Authenticated user profile
router.get('/auth/me', requireAuth, ctrl.getMe);

// Organisations
router.post('/organisations', requireAuth, ctrl.createOrganisation);
router.get('/organisations/current', requireAuth, tenantScope, ctrl.getOrganisation);

// Membership management (ORG_ADMIN only)
router.get('/organisations/current/members', requireAuth, tenantScope, requireRole('ORG_ADMIN'), ctrl.getMemberships);
router.post('/organisations/current/members', requireAuth, tenantScope, requireRole('ORG_ADMIN'), ctrl.addMembership);
router.delete('/organisations/current/members/:userId', requireAuth, tenantScope, requireRole('ORG_ADMIN'), ctrl.deactivateMembership);

// Statutory registrations
router.post('/organisations/current/registrations', requireAuth, tenantScope, requireRole('ORG_ADMIN'), ctrl.createRegistration);
router.get('/organisations/current/registrations', requireAuth, tenantScope, ctrl.getRegistrations);
router.patch('/organisations/current/registrations/:regId/verify', requireAuth, tenantScope, requireRole('ORG_ADMIN', 'AUDITOR'), ctrl.verifyRegistration);

export default router;
