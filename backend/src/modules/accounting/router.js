/**
 * accounting/router.js — paths relative to /api/v1
 */
import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/rbac.js';
import { tenantScope } from '../../middlewares/tenantScope.js';
import * as ctrl from './controller.js';

const router = Router();
const auth = [requireAuth, tenantScope];
const financeOnly = [...auth, requireRole('ORG_ADMIN', 'FINANCE_OFFICER')];

// Chart of accounts
router.get('/accounts', ...auth, ctrl.listAccounts);
router.post('/accounts', ...financeOnly, ctrl.createAccount);
router.get('/accounts/:id', ...auth, ctrl.getAccount);

// Journal entries (ER-08)
router.get('/journal-entries', ...auth, ctrl.listJournalEntries);
router.post('/journal-entries', ...financeOnly, ctrl.createJournalEntry);
router.get('/journal-entries/:id', ...auth, ctrl.getJournalEntry);
router.post('/journal-entries/:id/post', ...financeOnly, ctrl.postJournalEntry);
router.post('/journal-entries/:id/reverse', ...financeOnly, ctrl.reverseJournalEntry);

export default router;
