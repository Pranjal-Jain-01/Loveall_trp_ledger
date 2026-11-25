import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Calculator,
  MapPin,
  Users,
  Search,
  FileText,
  BarChart2,
  Lock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';

type UserRole = 'ORG_ADMIN' | 'FINANCE_OFFICER' | 'FIELD_WORKER' | 'SUPERVISOR' | 'INDEPENDENT_VERIFIER' | 'AUDITOR';

interface RoleConfig {
  key: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'primary' | 'secondary' | 'warning' | 'success' | 'info';
  permissions: string[];
  primaryActions: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
  secondaryActions: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
  complianceNotes: string[];
}

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  ORG_ADMIN: {
    key: 'ORG_ADMIN',
    label: 'Org Admin',
    description: 'Full organisational control — fund pools, programmes, agreements, disbursements, compliance, and user management.',
    icon: Shield,
    color: 'primary',
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
      { label: 'Compliance Logs', href: '/staff/compliance', icon: AlertTriangle },
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
    description: 'Manages fund operations — proposes disbursements, records payments, reconciles ledgers, and monitors pool balances.',
    icon: Calculator,
    color: 'secondary',
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
    description: 'On-ground programme delivery — views assigned programmes, submits activity evidence, tracks beneficiary disbursements.',
    icon: MapPin,
    color: 'success',
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
      { label: 'Compliance Notes', href: '/staff/compliance', icon: AlertTriangle },
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
    description: 'Oversees field operations — reviews activity evidence, approves conditional releases, monitors programme progress.',
    icon: Users,
    color: 'warning',
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
    description: 'Third-party verification — audits agreements, validates conditional releases, certifies compliance independently.',
    icon: CheckCircle,
    color: 'info',
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
    description: 'Full-scope audit access — reviews all ledger events, compliance checks, disbursement trails, and cryptographic proofs.',
    icon: Search,
    color: 'primary',
    permissions: [
      'Full read-only access to all ledger events (SHA-256 chain)',
      'Review all compliance check results & guardrail decisions',
      'Audit disbursement lifecycle: propose → approve → execute',
      'Verify cryptographic proofs (hashes, signatures, anchors)',
      'Export audit packages for regulatory review',
    ],
    primaryActions: [
      { label: 'Audit Trail', href: '/staff/ledger', icon: FileText },
      { label: 'Compliance Logs', href: '/staff/compliance', icon: AlertTriangle },
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

const COLOR_STYLES: Record<RoleConfig['color'], { bg: string; border: string; text: string; iconBg: string; iconText: string }> = {
  primary: { bg: 'bg-petrol/5', border: 'border-petrol/20', text: 'text-petrol', iconBg: 'bg-petrol/10', iconText: 'text-petrol' },
  secondary: { bg: 'bg-seafoam/5', border: 'border-seafoam/20', text: 'text-seafoam', iconBg: 'bg-seafoam/10', iconText: 'text-seafoam' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', iconBg: 'bg-amber-100', iconText: 'text-amber-700' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', iconBg: 'bg-emerald-100', iconText: 'text-emerald-700' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', iconBg: 'bg-blue-100', iconText: 'text-blue-700' },
};

const ROLE_ORDER: UserRole[] = ['ORG_ADMIN', 'FINANCE_OFFICER', 'FIELD_WORKER', 'SUPERVISOR', 'INDEPENDENT_VERIFIER', 'AUDITOR'];

interface RoleCardProps {
  config: RoleConfig;
  isActive?: boolean;
  onSelect?: () => void;
}

function RoleCard({ config, isActive, onSelect }: RoleCardProps) {
  const styles = COLOR_STYLES[config.color];
  const Icon = config.icon;

  return (
    <article
      className={`group relative p-6 rounded-2xl border transition-all duration-200 ${styles.bg} ${styles.border} ${isActive ? 'border-2 shadow-lg' : 'border hover:border-opacity-50 hover:shadow-md'}`}
      onClick={onSelect}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      {/* Role Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${styles.iconBg}`}>
            <Icon className={`w-6 h-6 ${styles.iconText}`} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">{config.label}</h3>
            <p className="text-sm text-ink/60 mt-0.5">{config.key.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Active
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-ink/70 mb-5 leading-relaxed">{config.description}</p>

      {/* Permissions */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">Permissions</h4>
        <ul className="space-y-2">
          {config.permissions.map((perm, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink/70">
              <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${styles.iconText}`} />
              <span>{perm}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary Actions */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">Primary Actions</h4>
        <div className="flex flex-wrap gap-2">
          {config.primaryActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${styles.border} ${styles.text} hover:bg-opacity-10`}
              onClick={(e) => e.stopPropagation()}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">Also Accessible</h4>
        <div className="flex flex-wrap gap-2">
          {config.secondaryActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink/60 bg-surface border border-hairline rounded-lg hover:bg-mist/10 hover:text-ink transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Compliance Notes */}
      <div className="pt-4 border-t border-hairline">
        <h4 className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Compliance Notes
        </h4>
        <ul className="space-y-2 text-xs text-ink/60">
          {config.complianceNotes.map((note, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-2 bg-ink/30 shrink-0" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function RoleWorkspacePage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ORG_ADMIN');

  // In a real app, this would come from auth context
  const currentUserRole: UserRole = 'ORG_ADMIN';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-ink tracking-tight">Role Workspaces</h1>
              <p className="mt-1 text-sm text-ink/60">
                Configured for: <span className="font-medium text-ink">LoveAll Foundation</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 text-xs font-medium bg-petrol/10 text-petrol border border-petrol/20 rounded-full">
                Current: {currentUserRole.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Role Selector Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 p-1 bg-surface border border-hairline rounded-xl">
            {ROLE_ORDER.map((roleKey) => {
              const config = ROLE_CONFIGS[roleKey];
              const Icon = config.icon;
              const styles = COLOR_STYLES[config.color];
              const isActive = selectedRole === roleKey;

              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setSelectedRole(roleKey)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? `${styles.bg} ${styles.text} shadow-sm`
                      : 'text-ink/60 hover:text-ink hover:bg-mist/30'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Role Detail Card */}
        <div className="animate-fadeIn">
          <RoleCard
            config={ROLE_CONFIGS[selectedRole]}
            isActive={selectedRole === currentUserRole}
          />
        </div>

        {/* All Roles Overview Grid */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-ink mb-6">All Role Workspaces</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {ROLE_ORDER.map((roleKey) => {
              const config = ROLE_CONFIGS[roleKey];
              const Icon = config.icon;
              const styles = COLOR_STYLES[config.color];
              const isCurrent = roleKey === currentUserRole;

              return (
                <Link
                  key={roleKey}
                  to="#"
                  onClick={(e) => { e.preventDefault(); setSelectedRole(roleKey); }}
                  className={`group p-5 rounded-xl border transition-all duration-200 ${styles.bg} ${styles.border} hover:shadow-lg hover:border-opacity-50 ${selectedRole === roleKey ? 'border-2' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${styles.iconBg}`}>
                        <Icon className={`w-5 h-5 ${styles.iconText}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink">{config.label}</h3>
                        <p className="text-xs text-ink/50">{config.key.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Current</span>
                    )}
                  </div>
                  <p className="text-sm text-ink/60 mb-4 line-clamp-2">{config.description}</p>
                  <div className="flex items-center gap-2 text-xs text-ink/50">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{config.permissions.length} permissions</span>
                    <span className="text-ink/30">•</span>
                    <span>{config.primaryActions.length} primary actions</span>
                  </div>
                  {selectedRole === roleKey && (
                    <div className="mt-3 pt-3 border-t border-current/20 flex items-center justify-between">
                      <span className="text-sm font-medium text-current">Viewing details →</span>
                      <ChevronRight className="w-4 h-4 text-current" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer Compliance Note */}
        <div className="mt-10 p-4 bg-surface border border-hairline rounded-xl">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-petrol shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-ink mb-1">Role-Based Access Control (RBAC)</h4>
              <p className="text-sm text-ink/60">
                All permissions are enforced at the API layer. UI elements respect the current user's role.
                Compliance guardrails (FCRA blocks, verified agreement gates, UTR requirements) cannot be bypassed
                by any role — they are enforced by database constraints and verified by the ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}