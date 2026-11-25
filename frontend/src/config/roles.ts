/**
 * LoveAll Foundation - Role Configurations
 * Centralized role definitions for RBAC workspace
 */

import type { ComponentType } from 'react';
import {
  Shield,
  Calculator,
  MapPin,
  Users,
  Search,
  FileText,
  BarChart2,
  Lock,
  CheckCircle,
} from 'lucide-react';

export type UserRole =
  | 'ORG_ADMIN'
  | 'FINANCE_OFFICER'
  | 'FIELD_WORKER'
  | 'SUPERVISOR'
  | 'INDEPENDENT_VERIFIER'
  | 'AUDITOR';

export interface RoleAction {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

export interface RoleConfig {
  key: UserRole;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  colorKey: 'org-admin' | 'finance-officer' | 'field-worker' | 'supervisor' | 'independent-verifier' | 'auditor';
  permissions: string[];
  primaryActions: RoleAction[];
  secondaryActions: RoleAction[];
  complianceNotes: string[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  ORG_ADMIN: {
    key: 'ORG_ADMIN',
    label: 'Org Admin',
    description:
      'Full organisational control — fund pools, programmes, agreements, disbursements, compliance, and user management.',
    icon: Shield,
    colorKey: 'org-admin',
    permissions: [
      'Create & manage fund pools (Domestic/Foreign/CSR/80G)',
      'Define programmes & funding agreements',
      'Propose, approve, and execute disbursements',
      'Override compliance blocks (with audit trail)',
      'Manage staff roles & access',
      'View all audit trails & ledger events',
    ],
    primaryActions: [
      { label: 'Fund Pools', href: '/staff/fund-pools', icon: Calculator },
      { label: 'Disbursements', href: '/staff/disbursements', icon: FileText },
    ],
    secondaryActions: [
      { label: 'Programmes', href: '/staff/programmes', icon: BarChart2 },
      { label: 'Agreements', href: '/staff/agreements', icon: FileText },
      { label: 'Staff Management', href: '/staff/users', icon: Users },
      { label: 'Compliance Logs', href: '/staff/compliance', icon: Lock },
    ],
    complianceNotes: [
      'Can approve disbursements up to any amount',
      'Can execute payments & record UTR references',
      'FCRA foreign→partner blocks are enforced; admin can override with documented justification',
    ],
  },
  FINANCE_OFFICER: {
    key: 'FINANCE_OFFICER',
    label: 'Finance Officer',
    description:
      'Manages fund operations — proposes disbursements, records payments, reconciles ledgers, and monitors pool balances.',
    icon: Calculator,
    colorKey: 'finance-officer',
    permissions: [
      'View all fund pools & balances',
      'Propose disbursements (requires admin approval)',
      'Execute approved disbursements & record UTR',
      'Reconcile bank statements with ledger events',
      'Generate financial reports & audit exports',
      'View compliance check results',
    ],
    primaryActions: [
      { label: 'Disbursements', href: '/staff/disbursements', icon: FileText },
      { label: 'Fund Pools', href: '/staff/fund-pools', icon: Calculator },
    ],
    secondaryActions: [
      { label: 'Reconciliation', href: '/staff/reconciliation', icon: Search },
      { label: 'Reports', href: '/staff/reports', icon: BarChart2 },
      { label: 'Ledger Events', href: '/staff/ledger', icon: FileText },
    ],
    complianceNotes: [
      'Can propose disbursements; requires ORG_ADMIN approval',
      'Can execute & record UTR for APPROVED disbursements only',
      'Cannot override compliance guardrails',
    ],
  },
  FIELD_WORKER: {
    key: 'FIELD_WORKER',
    label: 'Field Worker',
    description:
      'On-ground programme delivery — views assigned programmes, submits activity evidence, tracks beneficiary disbursements.',
    icon: MapPin,
    colorKey: 'field-worker',
    permissions: [
      'View assigned programmes & agreements',
      'Submit activity evidence (photos, reports)',
      'View disbursements for assigned programmes',
      'Track conditional release milestones',
      'Report field-level compliance observations',
    ],
    primaryActions: [
      { label: 'My Programmes', href: '/staff/programmes', icon: BarChart2 },
      { label: 'Submit Evidence', href: '/staff/evidence', icon: FileText },
    ],
    secondaryActions: [
      { label: 'Disbursements', href: '/staff/disbursements', icon: FileText },
      { label: 'Beneficiaries', href: '/staff/beneficiaries', icon: Users },
      { label: 'Compliance Notes', href: '/staff/compliance', icon: Lock },
    ],
    complianceNotes: [
      'Read-only access to disbursement data for assigned programmes',
      'Cannot propose, approve, or execute disbursements',
      'Evidence uploads are hashed & recorded to ledger',
    ],
  },
  SUPERVISOR: {
    key: 'SUPERVISOR',
    label: 'Supervisor',
    description:
      'Oversees field operations — reviews activity evidence, approves conditional releases, monitors programme progress.',
    icon: Users,
    colorKey: 'supervisor',
    permissions: [
      'Review & verify field worker evidence submissions',
      'Approve conditional release milestones',
      'Monitor programme delivery timelines',
      'View disbursement status for supervised programmes',
      'Escalate compliance issues to admin',
    ],
    primaryActions: [
      { label: 'Evidence Review', href: '/staff/evidence/review', icon: Search },
      { label: 'Programmes', href: '/staff/programmes', icon: BarChart2 },
    ],
    secondaryActions: [
      { label: 'Conditional Releases', href: '/staff/conditional-releases', icon: Lock },
      { label: 'Disbursements', href: '/staff/disbursements', icon: FileText },
      { label: 'Team Overview', href: '/staff/team', icon: Users },
    ],
    complianceNotes: [
      'Can verify evidence but cannot modify ledger records',
      'Conditional release approval requires VERIFIED agreement',
      'All actions logged with supervisor identity',
    ],
  },
  INDEPENDENT_VERIFIER: {
    key: 'INDEPENDENT_VERIFIER',
    label: 'Independent Verifier',
    description:
      'Third-party verification — audits agreements, validates conditional releases, certifies compliance independently.',
    icon: CheckCircle,
    colorKey: 'independent-verifier',
    permissions: [
      'View funding agreements & verification status',
      'Verify conditional release conditions independently',
      'Certify FCRA compliance for foreign-sourced funds',
      'Issue verification certificates with digital signatures',
      'Access read-only ledger audit trail',
    ],
    primaryActions: [
      { label: 'Agreements', href: '/staff/agreements', icon: FileText },
      { label: 'Verifications', href: '/staff/verifications', icon: CheckCircle },
    ],
    secondaryActions: [
      { label: 'Conditional Releases', href: '/staff/conditional-releases', icon: Lock },
      { label: 'Audit Trail', href: '/staff/ledger', icon: FileText },
      { label: 'Certificates', href: '/staff/certificates', icon: FileText },
    ],
    complianceNotes: [
      'Read-only access to disbursements & ledger',
      'Verification actions are immutable & cryptographically signed',
      'Cannot propose, approve, or execute disbursements',
    ],
  },
  AUDITOR: {
    key: 'AUDITOR',
    label: 'Auditor',
    description:
      'Full-scope audit access — reviews all ledger events, compliance checks, disbursement trails, and cryptographic proofs.',
    icon: Search,
    colorKey: 'auditor',
    permissions: [
      'Full read-only access to all ledger events (SHA-256 chain)',
      'Review all compliance check results & guardrail decisions',
      'Audit disbursement lifecycle: propose → approve → execute',
      'Verify cryptographic proofs (hashes, signatures, anchors)',
      'Export audit packages for regulatory review',
    ],
    primaryActions: [
      { label: 'Audit Trail', href: '/staff/ledger', icon: FileText },
      { label: 'Compliance Logs', href: '/staff/compliance', icon: Lock },
    ],
    secondaryActions: [
      { label: 'Disbursements', href: '/staff/disbursements', icon: FileText },
      { label: 'Fund Pools', href: '/staff/fund-pools', icon: Calculator },
      { label: 'Export Audit Pack', href: '/staff/audit/export', icon: FileText },
    ],
    complianceNotes: [
      'Strictly read-only — no write access to any system',
      'All access logged with auditor identity & timestamp',
      'Can verify SHA-256 chain integrity & Ed25519 signatures',
    ],
  },
};

export const ROLE_ORDER: UserRole[] = [
  'ORG_ADMIN',
  'FINANCE_OFFICER',
  'FIELD_WORKER',
  'SUPERVISOR',
  'INDEPENDENT_VERIFIER',
  'AUDITOR',
];

/**
 * Get role config by key
 */
export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLE_CONFIGS[role];
}

/**
 * Get all role configs in display order
 */
export function getAllRoleConfigs(): RoleConfig[] {
  return ROLE_ORDER.map((role) => ROLE_CONFIGS[role]);
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_CONFIGS[role].permissions.some((p) =>
    p.toLowerCase().includes(permission.toLowerCase())
  );
}