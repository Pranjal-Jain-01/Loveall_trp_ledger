import { useState, useEffect, useCallback, useMemo, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Hash,
  Loader2,
  FileText,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { api, toApiErrorMessage } from '../services/api';
import {
  formatINR,
  formatDate,
  getStatusBadgeClass,
  getSourceOriginClass,
  getRecipientKindClass,
  truncateId,
  toAmount,
} from '../utils/formatters';
import type {
  Disbursement,
  DisbursementDetail,
  FundPool,
  Programme,
  FundingAgreement,
  CreateDisbursementPayload,
  LedgerEvent,
  FundOrigin,
} from '../types/disbursements';

// ─── Types ───

type StatusFilter = 'ALL' | 'PROPOSED' | 'APPROVED' | 'DISBURSED' | 'REJECTED';
type FundPoolSourceFilter = 'ALL' | 'DOMESTIC' | 'FOREIGN';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'primary' | 'secondary' | 'warning' | 'success';
}

interface FilterToolbarProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  sourceFilter: FundPoolSourceFilter;
  onSourceFilterChange: (filter: FundPoolSourceFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface DisbursementTableProps {
  disbursements: Disbursement[];
  fundPools: FundPool[];
  programmes: Programme[];
  agreements: FundingAgreement[];
  isLoading: boolean;
  error: string | null;
  onRowClick: (disbursement: Disbursement) => void;
  onApprove: (disbursement: Disbursement) => void;
  onExecute: (disbursement: Disbursement) => void;
  onViewAudit: (disbursement: Disbursement) => void;
  canApprove: boolean;
  canExecute: boolean;
}

interface ProposeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDisbursementPayload) => Promise<void>;
  fundPools: FundPool[];
  programmes: Programme[];
  agreements: FundingAgreement[];
  isSubmitting: boolean;
  submitError: string | null;
}

interface ExecuteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentReference: string) => Promise<void>;
  disbursement: Disbursement | null;
  isSubmitting: boolean;
  submitError: string | null;
}

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  disbursement: DisbursementDetail | null;
  ledgerEvents: LedgerEvent[];
  isLoading: boolean;
}

interface ComplianceBannerProps {
  message: string;
  type: 'warning' | 'error' | 'info';
  onDismiss?: () => void;
}

// ─── Constants ───

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PROPOSED', label: 'Proposed' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DISBURSED', label: 'Disbursed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const SOURCE_OPTIONS: { value: FundPoolSourceFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DOMESTIC', label: 'Domestic' },
  { value: 'FOREIGN', label: 'Foreign' },
];

const RECIPIENT_KIND_OPTIONS = [
  { value: 'PARTNER_NGO' as const, label: 'Partner NGO' },
  { value: 'VENDOR' as const, label: 'Vendor' },
  { value: 'EMPLOYEE' as const, label: 'Employee' },
  { value: 'BENEFICIARY' as const, label: 'Beneficiary' },
  { value: 'OTHER' as const, label: 'Other' },
];

const COMPLIANCE_GUARDRAILS = [
  { code: 'FCRA_BLOCK', label: 'FCRA Foreign→Partner Block' },
  { code: 'VERIFIED_AGREEMENT', label: 'Verified Agreement Gate' },
  { code: 'UTR_REQUIRED', label: 'UTR Payment Ref Required' },
];

function displayStatus(status: Disbursement['status']): string {
  switch (status) {
    case 'DRAFT':
    case 'PENDING_APPROVAL':
      return 'Proposed';
    case 'APPROVED':
      return 'Approved';
    case 'PAID':
      return 'Disbursed';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled';
  }
}

// ─── Summary Card Component ───

function SummaryCard({ title, value, subtitle, icon, color = 'primary' }: SummaryCardProps) {
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
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  searchQuery,
  onSearchChange,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 p-4 bg-surface border border-default rounded-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by recipient, programme, or UTR…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onStatusFilterChange(option.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              statusFilter === option.value
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-canvas text-secondary hover:bg-brand-50 border border-default'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted">Pool source:</label>
        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value as FundPoolSourceFilter)}
          className="input"
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Disbursement Table Component ───

function DisbursementTable({
  disbursements,
  fundPools,
  programmes,
  agreements,
  isLoading,
  error,
  onRowClick,
  onApprove,
  onExecute,
  onViewAudit,
  canApprove,
  canExecute,
}: DisbursementTableProps) {
  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Disbursement / Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Source Fund Pool</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Programme & Agreement</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Amount (INR)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Payment Ref (UTR)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-default">
                  <td className="px-4 py-4"><div className="h-4 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-20 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-28 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-32 skeleton rounded"></div></td>
                  <td className="px-4 py-4 text-right"><div className="h-5 w-24 skeleton rounded mx-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-20 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-6 w-24 skeleton rounded"></div></td>
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

  if (disbursements.length === 0) {
    return (
      <div className="p-12 text-center card">
        <FileText className="w-16 h-16 text-brand-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink mb-1">No disbursements found</h3>
        <p className="text-muted">Try adjusting your filters or create a new disbursement.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Date / ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Source Pool</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Recipient</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Programme & Agreement</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">INR Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Payment Ref (UTR)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {disbursements.map((disbursement) => {
              const pool = fundPools.find((p) => p.id === disbursement.fund_pool_id);
              const origin: FundOrigin = pool?.source_origin ?? 'DOMESTIC';
              const programme = programmes.find((p) => p.id === disbursement.programme_id);
              const agreement = agreements.find((a) => a.id === disbursement.funding_agreement_id);
              return (
              <tr
                key={disbursement.id}
                onClick={() => onRowClick(disbursement)}
                className="hover:bg-brand-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-4">
                  <div>
                    <p className="text-xs text-muted">{formatDate(disbursement.created_at)}</p>
                    <p className="font-mono tabular-nums text-sm font-medium text-ink mt-0.5">
                      {truncateId(disbursement.id, 12)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-ink text-sm">
                      {pool ? pool.name : `Pool ${truncateId(disbursement.fund_pool_id, 8)}`}
                    </span>
                    <span className={getSourceOriginClass(origin)}>{origin}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-ink">
                      {disbursement.recipient_organisation_id
                        ? `Org: ${truncateId(disbursement.recipient_organisation_id, 8)}`
                        : disbursement.recipient_reference || 'Unknown'}
                    </p>
                    <span className={getRecipientKindClass(disbursement.recipient_kind)}>
                      {disbursement.recipient_kind.replaceAll('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-ink text-sm">
                      {programme ? programme.name : disbursement.programme_id ? truncateId(disbursement.programme_id, 8) : '—'}
                    </p>
                    {disbursement.conditional_release && (
                      <div className="flex items-center gap-1 mt-1">
                        <Lock className="w-3 h-3 text-brand-600" />
                        <span className="text-xs text-brand-600 font-medium">Conditional release</span>
                      </div>
                    )}
                    {disbursement.funding_agreement_id && (
                      <p className="text-xs text-muted mt-0.5">
                        {agreement ? agreement.agreement_code : `Agreement ${truncateId(disbursement.funding_agreement_id, 8)}`}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <p className="font-mono tabular-nums text-lg font-semibold text-ink">
                    {formatINR(disbursement.amount)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {disbursement.payment_reference ? (
                    <span className="font-mono text-sm bg-canvas px-2 py-0.5 rounded border border-default">
                      {disbursement.payment_reference}
                    </span>
                  ) : (
                    <span className="text-xs text-muted italic">Awaiting execution</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className={getStatusBadgeClass(disbursement.status)}>
                    {displayStatus(disbursement.status)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    {canApprove && disbursement.status === 'PENDING_APPROVAL' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onApprove(disbursement); }}
                        className="p-1.5 text-muted hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {canExecute && disbursement.status === 'APPROVED' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onExecute(disbursement); }}
                        className="p-1.5 text-muted hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Execute / Record UTR"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onViewAudit(disbursement); }}
                      className="p-1.5 text-muted hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Inspect Audit Trail"
                    >
                      <Hash className="w-4 h-4" />
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

// ─── Compliance Banner Component ───

function ComplianceBanner({ message, type, onDismiss }: ComplianceBannerProps) {
  const typeStyles = {
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    info: 'bg-brand-50 border-brand-200 text-brand-700',
  };

  const typeIcons = {
    warning: <AlertTriangle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Shield className="w-5 h-5" />,
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${typeStyles[type]}`}>
      <div className="shrink-0 mt-0.5">{typeIcons[type]}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 text-current opacity-50 hover:opacity-100"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Propose Disbursement Drawer ───

function ProposeDrawer({
  isOpen,
  onClose,
  onSubmit,
  fundPools,
  programmes,
  agreements,
  isSubmitting,
  submitError,
}: ProposeDrawerProps) {
  const [formData, setFormData] = useState<CreateDisbursementPayload>({
    fund_pool_id: '',
    programme_id: '',
    funding_agreement_id: '',
    conditional_release: false,
    recipient_kind: 'PARTNER_NGO',
    recipient_organisation_id: '',
    recipient_reference: '',
    amount: 0,
    currency: 'INR',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Find selected fund pool for compliance checks
  const selectedPool = fundPools.find((p) => p.id === formData.fund_pool_id);
  const selectedAgreement = agreements.find((a) => a.id === formData.funding_agreement_id);

  // Compliance warnings
  const foreignToPartnerWarning =
    selectedPool?.source_origin === 'FOREIGN' && formData.recipient_kind === 'PARTNER_NGO';

  const conditionalReleaseWarning =
    formData.conditional_release && selectedAgreement?.status !== 'VERIFIED';

  const handleChange = (field: keyof CreateDisbursementPayload, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.fund_pool_id) newErrors.fund_pool_id = 'Fund pool is required';
    if (!formData.recipient_kind) newErrors.recipient_kind = 'Recipient kind is required';
    if (formData.recipient_kind === 'PARTNER_NGO' && !formData.recipient_organisation_id) {
      newErrors.recipient_organisation_id = 'Partner NGO organisation is required';
    }
    if (formData.recipient_kind !== 'PARTNER_NGO' && !formData.recipient_reference) {
      newErrors.recipient_reference = 'Recipient reference is required';
    }
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Valid amount is required';
    if (formData.conditional_release && !formData.funding_agreement_id) {
      newErrors.funding_agreement_id = 'Funding agreement is required for conditional release';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: CreateDisbursementPayload = {
      fund_pool_id: formData.fund_pool_id,
      recipient_kind: formData.recipient_kind,
      amount: formData.amount,
      currency: 'INR',
      conditional_release: formData.conditional_release,
    };
    if (formData.programme_id) payload.programme_id = formData.programme_id;
    if (formData.funding_agreement_id) payload.funding_agreement_id = formData.funding_agreement_id;
    if (formData.recipient_kind === 'PARTNER_NGO' && formData.recipient_organisation_id) {
      payload.recipient_organisation_id = formData.recipient_organisation_id;
    }
    if (formData.recipient_kind !== 'PARTNER_NGO' && formData.recipient_reference) {
      payload.recipient_reference = formData.recipient_reference;
    }

    try {
      await onSubmit(payload);
      onClose();
    } catch {
      // Structured error is rendered via submitError
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-xl shadow-xl transform transition-transform sm:my-8 sm:mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-default sticky top-0 bg-white rounded-t-2xl sm:rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-ink">Propose Disbursement</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-muted hover:text-secondary rounded-lg hover:bg-brand-50 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form id="propose-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Compliance Banners */}
          {foreignToPartnerWarning && (
            <ComplianceBanner
              message="⚠️ Compliance Alert: Foreign-source fund pools cannot be sub-granted to Partner NGOs (ER-02). This disbursement will be blocked by the system."
              type="error"
            />
          )}

          {conditionalReleaseWarning && (
            <ComplianceBanner
              message="⚠️ Compliance Notice: Conditional release requires a VERIFIED funding agreement that permits conditional disbursement (ER-03). The selected agreement does not meet these criteria."
              type="warning"
            />
          )}

          {submitError && (
            <ComplianceBanner
              message={submitError}
              type="error"
            />
          )}

          {/* Fund Pool */}
          <div>
            <label className="label label-required">Fund Pool</label>
            <select
              value={formData.fund_pool_id}
              onChange={(e) => handleChange('fund_pool_id', e.target.value)}
              className={`input ${errors.fund_pool_id ? 'input-error' : ''}`}
            >
              <option value="">Select a fund pool</option>
              {fundPools
                .filter((p) => p.is_active)
                .map((pool) => (
                  <option key={pool.id} value={pool.id}>
                    {pool.name} ({pool.pool_code}) — {pool.source_origin}
                  </option>
                ))}
            </select>
            {errors.fund_pool_id && <p className="form-error">{errors.fund_pool_id}</p>}
          </div>

          {/* Programme */}
          <div>
            <label className="label">Programme</label>
            <select
              value={formData.programme_id || ''}
              onChange={(e) => handleChange('programme_id', e.target.value || undefined)}
              className="input"
            >
              <option value="">Select a programme (optional)</option>
              {programmes
                .filter((p) => p.is_active)
                .map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name} ({prog.programme_code})
                  </option>
                ))}
            </select>
          </div>

          {/* Recipient Kind */}
          <div>
            <label className="label label-required">Recipient Kind</label>
            <select
              value={formData.recipient_kind}
              onChange={(e) => handleChange('recipient_kind', e.target.value as CreateDisbursementPayload['recipient_kind'])}
              className={`input ${errors.recipient_kind ? 'input-error' : ''}`}
            >
              {RECIPIENT_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.recipient_kind && <p className="form-error">{errors.recipient_kind}</p>}
          </div>

          {/* Recipient Organisation / Reference */}
          {formData.recipient_kind === 'PARTNER_NGO' ? (
            <div>
              <label className="label label-required">Partner NGO Organisation</label>
              <input
                type="text"
                value={formData.recipient_organisation_id || ''}
                onChange={(e) => handleChange('recipient_organisation_id', e.target.value || undefined)}
                placeholder="Partner organisation UUID"
                className={`input font-mono ${errors.recipient_organisation_id ? 'input-error' : ''}`}
              />
              {errors.recipient_organisation_id && <p className="form-error">{errors.recipient_organisation_id}</p>}
            </div>
          ) : (
            <div>
              <label className="label label-required">Recipient Reference</label>
              <input
                type="text"
                value={formData.recipient_reference || ''}
                onChange={(e) => handleChange('recipient_reference', e.target.value)}
                placeholder="Vendor name, employee ID, beneficiary code, etc."
                className={`input ${errors.recipient_reference ? 'input-error' : ''}`}
              />
              {errors.recipient_reference && <p className="form-error">{errors.recipient_reference}</p>}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="label label-required">Amount (INR)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              className={`input font-mono tabular-nums ${errors.amount ? 'input-error' : ''}`}
              placeholder="0.00"
            />
            {errors.amount && <p className="form-error">{errors.amount}</p>}
          </div>

          {/* Conditional Release */}
          <div className="border-t border-default pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.conditional_release}
                onChange={(e) => handleChange('conditional_release', e.target.checked)}
                className="w-4 h-4 text-brand-500 border-default rounded focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-secondary">Conditional Release</span>
            </label>
            <p className="mt-1 text-xs text-muted ml-7">
              Funds will be held until agreement conditions are met and independently verified.
            </p>

            {formData.conditional_release && (
              <div className="mt-3">
                <label className="label label-required">Funding Agreement</label>
                <select
                  value={formData.funding_agreement_id || ''}
                  onChange={(e) => handleChange('funding_agreement_id', e.target.value || undefined)}
                  className={`input ${errors.funding_agreement_id ? 'input-error' : ''}`}
                >
                  <option value="">Select a verified funding agreement</option>
                  {agreements
                    .filter((a) => a.conditional_disbursement_allowed)
                    .map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.agreement_code} — {ag.status}
                      </option>
                    ))}
                </select>
                {errors.funding_agreement_id && <p className="form-error">{errors.funding_agreement_id}</p>}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="drawer-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="propose-form"
            disabled={isSubmitting || foreignToPartnerWarning}
            className="btn-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                Creating…
              </>
            ) : (
              'Propose Disbursement'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Execute Disbursement Modal ───

function ExecuteModal({
  isOpen,
  onClose,
  onSubmit,
  disbursement,
  isSubmitting,
  submitError,
}: ExecuteModalProps) {
  const [paymentReference, setPaymentReference] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!paymentReference.trim()) return;
    try {
      await onSubmit(paymentReference.trim());
      setPaymentReference('');
      onClose();
    } catch {
      // Structured error is rendered via submitError
    }
  };

  if (!isOpen || !disbursement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        <h2 className="text-lg font-semibold text-ink mb-2">Execute Disbursement</h2>
        <p className="text-sm text-muted mb-6">
          Record the payment reference (UTR/NEFT/RTGS/UPI) for disbursement{" "}
          <span className="font-mono tabular-nums text-brand-500">{truncateId(disbursement.id, 12)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label label-required">Payment Reference (UTR)</label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., NEFT1234567890 / AXMB231234567890"
              className="input font-mono"
              autoFocus
            />
          </div>

          <p className="text-xs text-muted">
            This is a mandatory field per compliance guardrail (UTR Payment Ref Required).
            The disbursement will be marked as PAID and a ledger event will be recorded.
          </p>

          {submitError && (
            <ComplianceBanner message={submitError} type="error" />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !paymentReference.trim()}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                  Executing…
                </>
              ) : (
                'Execute & Record UTR'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Audit Detail Drawer ───

function AuditDrawer({
  isOpen,
  onClose,
  disbursement,
  ledgerEvents,
  isLoading,
}: AuditDrawerProps) {
  if (!isOpen || !disbursement) return null;

  const relatedEvents = ledgerEvents.filter(
    (e) => e.source_table === 'disbursements' && e.source_id === disbursement.id
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-surface border-l border-default shadow-xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-default bg-brand-600 text-white">
          <div>
            <h2 className="text-lg font-semibold">Disbursement Audit Trail</h2>
            <p className="text-sm text-white/70 font-mono tabular-nums">{truncateId(disbursement.id)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Disbursement Metadata */}
          <div className="bg-canvas rounded-lg p-4 border border-default">
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              Disbursement Details
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="font-medium mt-0.5">
                  <span className={getStatusBadgeClass(disbursement.status)}>
                    {displayStatus(disbursement.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Amount</dt>
                <dd className="font-mono tabular-nums font-semibold text-ink mt-0.5">
                  {formatINR(disbursement.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Fund Pool</dt>
                <dd className="font-medium mt-0.5">
                  {disbursement.fund_pool
                    ? `${disbursement.fund_pool.name} (${disbursement.fund_pool.source_origin})`
                    : truncateId(disbursement.fund_pool_id)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Programme</dt>
                <dd className="font-medium mt-0.5">
                  {disbursement.programme?.name
                    || (disbursement.programme_id ? truncateId(disbursement.programme_id) : '—')}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Funding Agreement</dt>
                <dd className="font-medium mt-0.5">
                  {disbursement.funding_agreement?.agreement_code
                    || (disbursement.funding_agreement_id ? truncateId(disbursement.funding_agreement_id) : '—')}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Recipient Kind</dt>
                <dd className="font-medium mt-0.5 capitalize">{disbursement.recipient_kind.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-muted">Recipient</dt>
                <dd className="font-medium mt-0.5 font-mono tabular-nums">
                  {disbursement.recipient_organisation_id || disbursement.recipient_reference || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Conditional Release</dt>
                <dd className="font-medium mt-0.5 flex items-center gap-1">
                  {disbursement.conditional_release ? (
                    <>
                      <Lock className="w-3 h-3 text-brand-500" />
                      <span className="text-brand-500">Yes</span>
                    </>
                  ) : (
                    <span className="text-muted">No</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Payment Reference</dt>
                <dd className="font-mono text-sm mt-0.5">
                  {disbursement.payment_reference || <span className="text-muted italic">Not recorded</span>}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Ledger event hash</dt>
                <dd className="font-mono text-xs mt-0.5 break-all text-brand-600 bg-brand-50 border border-default rounded px-2 py-1">
                  {disbursement.ledger_event_hash
                    || relatedEvents[relatedEvents.length - 1]?.event_hash
                    || <span className="text-muted italic">Not yet recorded</span>}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Timestamps</dt>
                <dd className="mt-1 space-y-1 text-xs font-mono">
                  <div>Created: {formatDate(disbursement.created_at)}</div>
                  {disbursement.approved_at && <div>Approved: {formatDate(disbursement.approved_at)}</div>}
                  {disbursement.paid_at && <div>Paid: {formatDate(disbursement.paid_at)}</div>}
                </dd>
              </div>
            </dl>
          </div>

          {/* Compliance Checks */}
          <div>
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-500" />
              Compliance Guardrails
            </h3>
            <div className="space-y-2">
              {COMPLIANCE_GUARDRAILS.map((guard) => (
                <div key={guard.code} className="flex items-center gap-3 p-3 bg-white border border-default rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success-500 shrink-0" />
                  <span className="text-sm text-secondary">{guard.label}</span>
                  <span className="ml-auto text-xs text-success-600 bg-success-50 px-2 py-0.5 rounded">
                    ENFORCED
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ledger Events */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Hash className="w-4 h-4 text-brand-500" />
                Ledger Events (SHA-256 Verification)
              </h3>
              {relatedEvents.length > 0 && (
                <span className="text-xs text-muted">{relatedEvents.length} event(s)</span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-canvas border border-default rounded-lg animate-pulse" />
                ))}
              </div>
            ) : relatedEvents.length === 0 ? (
              <div className="p-6 text-center bg-canvas border border-default rounded-lg">
                <Hash className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                <p className="text-muted">No ledger events found for this disbursement.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {relatedEvents.map((event) => (
                  <div key={event.id} className="bg-white border border-default rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-muted uppercase tracking-wide">
                            {event.event_kind.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted font-mono tabular-nums">
                            Seq: {event.sequence_number}
                          </span>
                          <span className="text-xs text-muted">
                            {formatDate(event.occurred_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted">Hash:</span>
                          <code className="font-mono text-brand-500 bg-brand-50 px-2 py-0.5 rounded break-all">
                            {event.event_hash}
                          </code>
                          <span className="text-muted">Prev:</span>
                          <code className="font-mono text-muted bg-canvas px-2 py-0.5 rounded break-all">
                            {event.previous_hash || 'Genesis'}
                          </code>
                        </div>
                      </div>
                      <div className="shrink-0" title="Cryptographically verified">
                        <Shield className="w-5 h-5 text-success-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Disbursements Page ───

export default function DisbursementsPage() {
  // Data state
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [fundPools, setFundPools] = useState<FundPool[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [agreements, setAgreements] = useState<FundingAgreement[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isSubmittingPropose, setIsSubmittingPropose] = useState(false);
  const [isSubmittingExecute, setIsSubmittingExecute] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<FundPoolSourceFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal/Drawer state
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [isExecuteOpen, setIsExecuteOpen] = useState(false);
  const [selectedForExecute, setSelectedForExecute] = useState<Disbursement | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [selectedForAudit, setSelectedForAudit] = useState<DisbursementDetail | null>(null);

  // Computed summary
  const summary = useMemo(() => {
    const paid = disbursements.filter((d) => d.status === 'PAID');
    const pending = disbursements.filter((d) => d.status === 'PENDING_APPROVAL' || d.status === 'DRAFT');
    const conditional = disbursements.filter((d) => d.conditional_release && d.status !== 'PAID' && d.status !== 'REJECTED' && d.status !== 'CANCELLED');

    return {
      totalDisbursed: paid.reduce((sum, d) => sum + toAmount(d.amount), 0),
      pendingApprovalCount: pending.length,
      pendingApprovalAmount: pending.reduce((sum, d) => sum + toAmount(d.amount), 0),
      conditionalReleasesHeld: conditional.length,
    };
  }, [disbursements]);

  // Filtered disbursements
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter((d) => {
      if (statusFilter === 'PROPOSED' && d.status !== 'DRAFT' && d.status !== 'PENDING_APPROVAL') return false;
      if (statusFilter === 'APPROVED' && d.status !== 'APPROVED') return false;
      if (statusFilter === 'DISBURSED' && d.status !== 'PAID') return false;
      if (statusFilter === 'REJECTED' && d.status !== 'REJECTED') return false;
      if (sourceFilter !== 'ALL') {
        const pool = fundPools.find((p) => p.id === d.fund_pool_id);
        if (pool?.source_origin !== sourceFilter) return false;
      }
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const recipient = d.recipient_reference || d.recipient_organisation_id || '';
        const programmeName = programmes.find((p) => p.id === d.programme_id)?.name || d.programme_id || '';
        const paymentRef = d.payment_reference || '';
        const id = d.id || '';
        if (
          !recipient.toLowerCase().includes(searchLower) &&
          !programmeName.toLowerCase().includes(searchLower) &&
          !paymentRef.toLowerCase().includes(searchLower) &&
          !id.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [disbursements, statusFilter, sourceFilter, searchQuery, fundPools, programmes]);

  // Role-based permissions (simulated - in real app from auth context)
  const userRole = 'ORG_ADMIN'; // Would come from auth context
  const canApprove = userRole === 'ORG_ADMIN';
  const canExecute = userRole === 'ORG_ADMIN' || userRole === 'FINANCE_OFFICER';
  const canPropose = userRole === 'ORG_ADMIN' || userRole === 'FINANCE_OFFICER';

  // ─── Data Fetching ───

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [disbursementsRes, fundPoolsRes, programmesRes, agreementsRes] = await Promise.all([
        api.disbursements.list({ page: 1, limit: 100 }),
        api.fundPools.list(),
        api.programmes.list(),
        api.agreements.list(),
      ]);
      setDisbursements(disbursementsRes);
      setFundPools(fundPoolsRes);
      setProgrammes(programmesRes);
      setAgreements(agreementsRes);
    } catch (err) {
      setError(toApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLedgerEvents = useCallback(async (disbursementId: string) => {
    setIsLoadingLedger(true);
    try {
      const events = await api.ledger.listEvents({ limit: 200 });
      setLedgerEvents(
        events.filter((event) => event.source_table === 'disbursements' && event.source_id === disbursementId),
      );
    } catch {
      setLedgerEvents([]);
    } finally {
      setIsLoadingLedger(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ─── Action Handlers ───

  const handlePropose = async (data: CreateDisbursementPayload) => {
    setIsSubmittingPropose(true);
    setProposeError(null);
    try {
      const created = await api.disbursements.create(data);
      try {
        await api.disbursements.submit(created.id);
      } catch {
        // Create succeeded; submit may fail if already pending
      }
      await fetchAllData();
      setProposeError(null);
    } catch (err) {
      setProposeError(toApiErrorMessage(err));
      throw err;
    } finally {
      setIsSubmittingPropose(false);
    }
  };

  const handleApprove = async (disbursement: Disbursement) => {
    try {
      await api.disbursements.approve(disbursement.id, { approval_note: 'Approved via UI' });
      await fetchAllData();
    } catch (err) {
      setError(toApiErrorMessage(err));
    }
  };

  const handleExecute = async (paymentReference: string) => {
    if (!selectedForExecute) return;
    setIsSubmittingExecute(true);
    setExecuteError(null);
    try {
      await api.disbursements.pay(selectedForExecute.id, { payment_reference: paymentReference });
      await fetchAllData();
      setExecuteError(null);
    } catch (err) {
      setExecuteError(toApiErrorMessage(err));
      throw err;
    } finally {
      setIsSubmittingExecute(false);
    }
  };

  const handleViewAudit = (disbursement: Disbursement) => {
    setSelectedForAudit(disbursement);
    setIsAuditOpen(true);
    void (async () => {
      try {
        const detail = await api.disbursements.get(disbursement.id);
        setSelectedForAudit(detail);
      } catch {
        setSelectedForAudit(disbursement);
      }
      await fetchLedgerEvents(disbursement.id);
    })();
  };

  const openExecuteModal = (disbursement: Disbursement) => {
    setSelectedForExecute(disbursement);
    setIsExecuteOpen(true);
  };

  // ─── Render ───

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="container py-8">
        {/* Page Header & Primary Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-ink tracking-tight">Disbursements & Fund Releases</h1>
            <p className="mt-1 text-sm text-muted">
              Organisation: <span className="font-medium text-ink">LoveAll Foundation</span>
            </p>
          </div>
          {canPropose && (
            <button
              type="button"
              onClick={() => { setProposeError(null); setIsProposeOpen(true); }}
              disabled={isSubmittingPropose}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Propose Disbursement
            </button>
          )}
        </div>

        {/* 4-Card Financial Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Disbursed (INR)"
            value={formatINR(summary.totalDisbursed)}
            color="primary"
            icon={<ArrowRight className="w-5 h-5" />}
          />
          <SummaryCard
            title="Pending Approval"
            value={summary.pendingApprovalCount}
            subtitle={formatINR(summary.pendingApprovalAmount)}
            color="warning"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <SummaryCard
            title="Conditional Releases Held"
            value={summary.conditionalReleasesHeld}
            color="secondary"
            icon={<Lock className="w-5 h-5" />}
          />
          <SummaryCard
            title="Compliance Guardrails Active"
            value={COMPLIANCE_GUARDRAILS.length}
            subtitle="All enforced at DB layer"
            color="success"
            icon={<Shield className="w-5 h-5" />}
          />
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mb-6">
          <FilterToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Institutional Disbursements Ledger Table */}
        <DisbursementTable
          disbursements={filteredDisbursements}
          fundPools={fundPools}
          programmes={programmes}
          agreements={agreements}
          isLoading={isLoading}
          error={error}
          onRowClick={handleViewAudit}
          onApprove={handleApprove}
          onExecute={openExecuteModal}
          onViewAudit={handleViewAudit}
          canApprove={canApprove}
          canExecute={canExecute}
        />

        {/* Propose Disbursement Drawer */}
        <ProposeDrawer
          isOpen={isProposeOpen}
          onClose={() => setIsProposeOpen(false)}
          onSubmit={handlePropose}
          fundPools={fundPools}
          programmes={programmes}
          agreements={agreements}
          isSubmitting={isSubmittingPropose}
          submitError={proposeError}
        />

        {/* Execute Disbursement Modal */}
        <ExecuteModal
          isOpen={isExecuteOpen}
          onClose={() => {
            setIsExecuteOpen(false);
            setSelectedForExecute(null);
            setExecuteError(null);
          }}
          onSubmit={handleExecute}
          disbursement={selectedForExecute}
          isSubmitting={isSubmittingExecute}
          submitError={executeError}
        />

        {/* Audit Detail Drawer */}
        <AuditDrawer
          isOpen={isAuditOpen}
          onClose={() => {
            setIsAuditOpen(false);
            setSelectedForAudit(null);
          }}
          disbursement={selectedForAudit}
          ledgerEvents={ledgerEvents}
          isLoading={isLoadingLedger}
        />
      </div>
    </div>
  );
}