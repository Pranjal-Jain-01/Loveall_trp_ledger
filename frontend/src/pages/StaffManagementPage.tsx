import { useState, useEffect, useCallback, useMemo, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Search,
  Users,
  Shield,
  UserX,
  AlertTriangle,
  XCircle,
  Loader2,
  Eye,
  Settings,
  Building2,
  FileText,
} from 'lucide-react';
import { toApiErrorMessage } from '../services/api';
import type { UserRole } from '../config/roles';
import { getRoleColors } from '../styles/palette';

// ─── Types ───

interface StaffMember {
  id: string;
  user_id: string;
  organisation_id: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE';
  user: {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
}

interface StaffSummary {
  totalMembers: number;
  governanceFinance: number;
  fieldOperations: number;
  assuranceAudit: number;
}

interface FilterToolbarProps {
  roleFilter: UserRole | 'ALL';
  onRoleFilterChange: (filter: UserRole | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface StaffTableProps {
  staff: StaffMember[];
  isLoading: boolean;
  error: string | null;
  onChangeRole: (member: StaffMember, newRole: UserRole) => void;
  onDeactivate: (member: StaffMember) => void;
  canManage: boolean;
}

interface AddStaffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddStaffPayload) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
}

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (role: UserRole) => Promise<void>;
  member: StaffMember | null;
  isSubmitting: boolean;
  submitError: string | null;
}

interface DeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  member: StaffMember | null;
  isSubmitting: boolean;
}

interface AddStaffPayload {
  email: string;
  role: UserRole;
  sendInvite: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'ORG_ADMIN', label: 'Org Admin', description: 'Full organisational control — fund pools, programmes, agreements, disbursements, compliance, and user management' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer', description: 'Manages fund operations — proposes disbursements, records payments, reconciles ledgers, and monitors pool balances' },
  { value: 'FIELD_WORKER', label: 'Field Worker', description: 'On-ground programme delivery — views assigned programmes, submits activity evidence, tracks beneficiary disbursements' },
  { value: 'SUPERVISOR', label: 'Supervisor', description: 'Oversees field operations — reviews activity evidence, approves conditional releases, monitors programme progress' },
  { value: 'INDEPENDENT_VERIFIER', label: 'Independent Verifier', description: 'Third-party verification — audits agreements, validates conditional releases, certifies compliance independently' },
  { value: 'AUDITOR', label: 'Auditor', description: 'Full-scope audit access — reviews all ledger events, compliance checks, disbursement trails, and cryptographic proofs' },
];

const ROLE_RESTRICTIONS: Record<UserRole, string[]> = {
  ORG_ADMIN: [
    'Can approve disbursements up to any amount',
    'Can execute payments & record UTR references',
    'FCRA foreign→partner blocks enforced; admin can override with documented justification',
    'Can manage all staff roles & access',
    'Can override compliance blocks (with audit trail)',
  ],
  FINANCE_OFFICER: [
    'Can propose disbursements; requires ORG_ADMIN approval',
    'Can execute & record UTR for APPROVED disbursements only',
    'Cannot override compliance guardrails',
    'View all fund pools & balances',
    'Generate financial reports & audit exports',
  ],
  FIELD_WORKER: [
    'Read-only access to disbursement data for assigned programmes',
    'Cannot propose, approve, or execute disbursements',
    'Evidence uploads are hashed & recorded to ledger',
    'View assigned programmes & agreements',
    'Submit activity evidence (photos, reports)',
  ],
  SUPERVISOR: [
    'Can verify evidence but cannot modify ledger records',
    'Conditional release approval requires VERIFIED agreement',
    'All actions logged with supervisor identity',
    'Review & verify field worker evidence submissions',
    'Approve conditional release milestones',
  ],
  INDEPENDENT_VERIFIER: [
    'Read-only access to disbursements & ledger',
    'Verification actions are immutable & cryptographically signed',
    'Cannot propose, approve, or execute disbursements',
    'Certify FCRA compliance for foreign-sourced funds',
    'Issue verification certificates with digital signatures',
  ],
  AUDITOR: [
    'Strictly read-only — no write access to any system',
    'All access logged with auditor identity & timestamp',
    'Can verify SHA-256 chain integrity & Ed25519 signatures',
    'Full read-only access to all ledger events (SHA-256 chain)',
    'Export audit packages for regulatory review',
  ],
};

// ─── Summary Card Component ───

function SummaryCard({ title, value, subtitle, icon, color = 'primary' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'primary' | 'secondary' | 'warning' | 'success';
}) {
  const colorStyles = {
    primary: 'border-l-brand-600 bg-brand-50',
    secondary: 'border-l-brand-500 bg-brand-50/50',
    warning: 'border-l-warning-500 bg-warning-50',
    success: 'border-l-success-500 bg-success-50',
  };

  const iconBgStyles = {
    primary: 'bg-brand-100 text-brand-600',
    secondary: 'bg-brand-50 text-brand-500',
    warning: 'bg-warning-50 text-warning-600',
    success: 'bg-success-50 text-success-600',
  };

  return (
    <div className={`flex flex-col p-4 bg-surface border border-default rounded-xl border-l-4 ${colorStyles[color]} relative overflow-hidden`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wide">{title}</p>
          <p className="mt-1 font-mono tabular-nums text-2xl font-semibold text-ink">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg ${iconBgStyles[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter Toolbar Component ───

function FilterToolbar({
  roleFilter,
  onRoleFilterChange,
  searchQuery,
  onSearchChange,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 p-4 bg-surface border border-default rounded-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value as UserRole | 'ALL')}
          className="input w-auto"
        >
          <option value="ALL">All Roles</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Staff Table Component ───

function StaffTable({
  staff,
  isLoading,
  error,
  onChangeRole,
  onDeactivate,
  canManage,
}: StaffTableProps) {
  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Staff Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Assigned Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Segregation of Duties Scope</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-default">
                  <td className="px-4 py-4"><div className="h-4 w-32 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-48 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-6 w-32 skeleton rounded"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center card">
        <AlertTriangle className="w-12 h-12 text-warning-500 mx-auto mb-3" />
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="p-12 text-center card">
        <Users className="w-16 h-16 text-brand-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink mb-1">No staff members found</h3>
        <p className="text-muted">Try adjusting your filters or add a new staff member.</p>
      </div>
    );
  }

  const getRoleDescription = (role: UserRole): string => {
    const option = ROLE_OPTIONS.find((o) => o.value === role);
    return option?.description || '';
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Staff Member</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Assigned Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Segregation of Duties Scope</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {staff.map((member) => {
              const roleOption = ROLE_OPTIONS.find((o) => o.value === member.role);
              const colors = getRoleColors(member.role);

              return (
              <tr key={member.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-100 text-brand-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-ink text-sm">{member.user.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted font-mono">{member.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.border} ${colors.text}`}>
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {roleOption?.label || member.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-muted line-clamp-1 max-w-xs">{getRoleDescription(member.role)}</p>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.status === 'ACTIVE'
                      ? 'bg-success-50 text-success-700 border border-success-100'
                      : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    {canManage && member.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => onChangeRole(member, member.role)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Change Role"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Change Role
                      </button>
                    )}
                    {canManage && member.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => onDeactivate(member)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-error-600 hover:text-error-700 hover:bg-error-50 rounded-lg transition-colors"
                        title="Deactivate"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Deactivate
                      </button>
                    )}
                    <button
                      type="button"
                      className="p-1.5 text-muted hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Add Staff Drawer ───

function AddStaffDrawer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  submitError,
}: AddStaffDrawerProps) {
  const [formData, setFormData] = useState<AddStaffPayload>({
    email: '',
    role: 'FIELD_WORKER',
    sendInvite: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<UserRole>('FIELD_WORKER');

  const handleChange = (field: keyof AddStaffPayload, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.role) newErrors.role = 'Role is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch {
      // Structured error is rendered via submitError
    }
  };

  if (!isOpen) return null;

  const restrictions = ROLE_RESTRICTIONS[selectedRole] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-xl shadow-xl transform transition-transform sm:my-8 sm:mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-default sticky top-0 bg-white rounded-t-2xl sm:rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-ink">Add Staff Member</h2>
          <button type="button" onClick={onClose} className="p-2 text-muted hover:text-secondary rounded-lg hover:bg-brand-50 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form id="add-staff-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {submitError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-error-50 border-error-200 text-error-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1"><p className="text-sm font-medium">{submitError}</p></div>
            </div>
          )}

          <div>
            <label className="label label-required">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="staff@organisation.org"
              className={`input ${errors.email ? 'input-error' : ''}`}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div>
            <label className="label label-required">Assign Role</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRole === opt.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-default hover:border-brand-300 hover:bg-brand-50/50'
                }`}>
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={selectedRole === opt.value}
                    onChange={() => {
                      setSelectedRole(opt.value);
                      handleChange('role', opt.value);
                    }}
                    className="w-4 h-4 text-brand-500 border-brand-300 focus:ring-brand-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-ink">{opt.label}</p>
                    <p className="text-xs text-muted mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {errors.role && <p className="form-error">{errors.role}</p>}
          </div>

          {/* Live Preview of Role Restrictions */}
          <div className="border-t border-default pt-4">
            <h4 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-500" />
              Compliance Restrictions for {ROLE_OPTIONS.find(o => o.value === selectedRole)?.label}
            </h4>
            <ul className="space-y-2 text-sm text-muted">
              {restrictions.map((restriction, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-2 bg-muted/30 shrink-0" />
                  <span>{restriction}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="send-invite"
              checked={formData.sendInvite}
              onChange={(e) => handleChange('sendInvite', e.target.checked)}
              className="w-4 h-4 text-brand-500 border-default rounded focus:ring-brand-500"
            />
            <label htmlFor="send-invite" className="text-sm font-medium text-secondary cursor-pointer">
              Send invitation email to staff member
            </label>
          </div>
        </form>

        <div className="drawer-footer">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="add-staff-form" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <> <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Adding… </>
            ) : (
              'Add Staff Member'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Change Role Modal ───

function ChangeRoleModal({
  isOpen,
  onClose,
  onSubmit,
  member,
  isSubmitting,
  submitError,
}: ChangeRoleModalProps) {
  const [newRole, setNewRole] = useState<UserRole | ''>('');

  if (!isOpen || !member) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRole) return;
    try {
      await onSubmit(newRole);
      onClose();
    } catch {
      // Error handled via submitError
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        <h2 className="text-lg font-semibold text-ink mb-2">Change Role</h2>
        <p className="text-sm text-muted mb-6">
          Update role for <span className="font-medium text-ink">{member.user.full_name}</span>
          (<span className="font-mono text-sm">{member.user.email}</span>)
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">New Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="input"
              required
            >
              <option value="">Select a role</option>
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg">
            <p className="text-xs font-medium text-brand-700 mb-2">Role Change Implications</p>
            <ul className="space-y-1 text-xs text-brand-600">
              <li>• All future actions will be governed by the new role's permissions</li>
              <li>• Previous audit trail remains unchanged</li>
              <li>• Compliance restrictions update immediately</li>
            </ul>
          </div>

          {submitError && (
            <div className="p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting || !newRole} className="btn-primary">
              {isSubmitting ? (
                <> <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Updating… </>
              ) : (
                'Change Role'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deactivate Modal ───

function DeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  member,
  isSubmitting,
}: DeactivateModalProps) {
  if (!isOpen || !member) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handled via callback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-error-100 text-error-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Deactivate Staff Member</h2>
            <p className="text-sm text-muted">{member.user.full_name} ({member.user.email})</p>
          </div>
        </div>

        <p className="text-sm text-muted mb-6">
          This will revoke all access for this staff member. They will no longer be able to
          log in or perform any actions. This action can be reversed by an Org Admin.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
            <p className="text-xs font-medium text-warning-700">⚠️ This action will:</p>
            <ul className="space-y-1 text-xs text-warning-600 mt-1">
              <li>• Revoke all role-based permissions immediately</li>
              <li>• Prevent login and API access</li>
              <li>• Preserve audit trail and historical actions</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-danger">
              {isSubmitting ? (
                <> <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Deactivating… </>
              ) : (
                'Deactivate Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Staff Management Page ───

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [isSubmittingDeactivate, setIsSubmittingDeactivate] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [memberForRoleChange, setMemberForRoleChange] = useState<StaffMember | null>(null);
  const [memberForDeactivate, setMemberForDeactivate] = useState<StaffMember | null>(null);

  // Role-based permissions
  const userRole = 'ORG_ADMIN';
  const canManage = userRole === 'ORG_ADMIN';

  // Computed summary
  const summary = useMemo((): StaffSummary => {
    const totalMembers = staff.filter((s) => s.status === 'ACTIVE').length;
    const governanceFinance = staff.filter(
      (s) => s.status === 'ACTIVE' && (s.role === 'ORG_ADMIN' || s.role === 'FINANCE_OFFICER')
    ).length;
    const fieldOperations = staff.filter(
      (s) => s.status === 'ACTIVE' && (s.role === 'FIELD_WORKER' || s.role === 'SUPERVISOR')
    ).length;
    const assuranceAudit = staff.filter(
      (s) => s.status === 'ACTIVE' && (s.role === 'INDEPENDENT_VERIFIER' || s.role === 'AUDITOR')
    ).length;

    return { totalMembers, governanceFinance, fieldOperations, assuranceAudit };
  }, [staff]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (
          !(s.user.full_name || '').toLowerCase().includes(searchLower) &&
          !(s.user.email || '').toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [staff, roleFilter, searchQuery]);

  // ─── Data Fetching ───

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use auth-org membership endpoint
      const response = await fetch('/api/v1/organisations/current/members', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      // Transform the response to match our StaffMember interface
      const members = (data.data || data).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        organisation_id: m.organisation_id,
        role: m.role,
        status: m.status || 'ACTIVE',
        user: {
          id: m.user?.id || m.user_id,
          email: m.user?.email || '',
          full_name: m.user?.full_name || m.user?.name || 'Unknown',
          created_at: m.user?.created_at || m.created_at,
        },
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));
      setStaff(members);
    } catch (err) {
      setError(toApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Action Handlers ───

  const handleAddStaff = async (data: AddStaffPayload) => {
    setIsSubmittingAdd(true);
    setAddError(null);
    try {
      const response = await fetch('/api/v1/organisations/current/members', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          role: data.role,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add member');
      }
      await fetchAllData();
      setAddError(null);
    } catch (err) {
      setAddError(toApiErrorMessage(err));
      throw err;
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleChangeRole = (member: StaffMember) => {
    setMemberForRoleChange(member);
    setIsChangeRoleOpen(true);
  };

  const confirmChangeRole = async (newRole: UserRole) => {
    if (!memberForRoleChange) return;
    setIsSubmittingRole(true);
    setRoleError(null);
    try {
      // In a real app, this would be a PATCH to update membership
      const response = await fetch(`/api/v1/organisations/current/members/${memberForRoleChange.user_id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!response.ok) throw new Error('Failed to update role');
      await fetchAllData();
      setIsChangeRoleOpen(false);
      setMemberForRoleChange(null);
    } catch (err) {
      setRoleError(toApiErrorMessage(err));
      throw err;
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleDeactivate = (member: StaffMember) => {
    setMemberForDeactivate(member);
    setIsDeactivateOpen(true);
  };

  const confirmDeactivate = async () => {
    if (!memberForDeactivate) return;
    setIsSubmittingDeactivate(true);
    try {
      const response = await fetch(`/api/v1/organisations/current/members/${memberForDeactivate.user_id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to deactivate member');
      await fetchAllData();
      setIsDeactivateOpen(false);
      setMemberForDeactivate(null);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmittingDeactivate(false);
    }
  };

  // ─── Render ───

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="container py-8">
        {/* Page Header & Primary Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-ink tracking-tight">Staff Management</h1>
            <p className="mt-1 text-sm text-muted">Role-based access control and segregation of duties for active organisation</p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => { setAddError(null); setIsAddOpen(true); }}
              disabled={isSubmittingAdd}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Staff Member
            </button>
          )}
        </div>

        {/* 4-Card KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Organisation Members"
            value={summary.totalMembers}
            color="primary"
            icon={<Users className="w-5 h-5" />}
          />
          <SummaryCard
            title="Governance & Finance"
            value={summary.governanceFinance}
            subtitle="ORG_ADMIN + FINANCE_OFFICER"
            color="secondary"
            icon={<Shield className="w-5 h-5" />}
          />
          <SummaryCard
            title="Field & Operations"
            value={summary.fieldOperations}
            subtitle="FIELD_WORKER + SUPERVISOR"
            color="warning"
            icon={<Building2 className="w-5 h-5" />}
          />
          <SummaryCard
            title="Assurance & Audit"
            value={summary.assuranceAudit}
            subtitle="INDEPENDENT_VERIFIER + AUDITOR"
            color="success"
            icon={<FileText className="w-5 h-5" />}
          />
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mb-6">
          <FilterToolbar
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Staff Directory Table */}
        <StaffTable
          staff={filteredStaff}
          isLoading={isLoading}
          error={error}
          onChangeRole={handleChangeRole}
          onDeactivate={handleDeactivate}
          canManage={canManage}
        />

        {/* Add Staff Drawer */}
        <AddStaffDrawer
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSubmit={handleAddStaff}
          isSubmitting={isSubmittingAdd}
          submitError={addError}
        />

        {/* Change Role Modal */}
        <ChangeRoleModal
          isOpen={isChangeRoleOpen}
          onClose={() => { setIsChangeRoleOpen(false); setMemberForRoleChange(null); }}
          onSubmit={confirmChangeRole}
          member={memberForRoleChange}
          isSubmitting={isSubmittingRole}
          submitError={roleError}
        />

        {/* Deactivate Modal */}
        <DeactivateModal
          isOpen={isDeactivateOpen}
          onClose={() => { setIsDeactivateOpen(false); setMemberForDeactivate(null); }}
          onConfirm={confirmDeactivate}
          member={memberForDeactivate}
          isSubmitting={isSubmittingDeactivate}
        />
      </div>
    </div>
  );
}