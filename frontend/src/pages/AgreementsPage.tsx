import { useState, useEffect, useCallback, useMemo, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Search,
  FileText,
  Shield,
  Lock,
  AlertTriangle,
  XCircle,
  Loader2,
  CheckCircle,
  Eye,
  Building2,
  DollarSign,
  Flag,
} from 'lucide-react';
import { api, toApiErrorMessage } from '../services/api';
import {
  formatINR,
  formatShortDate,
  getStatusBadgeClass,
  truncateId,
  toAmount,
} from '../utils/formatters';
import type {
  FundingAgreement,
  Programme,
  Disbursement,
  CreateAgreementPayload,
  VerifyAgreementPayload,
} from '../types/disbursements';

// ─── Types ───

type AgreementStatusFilter = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'primary' | 'secondary' | 'warning' | 'success';
}

interface FilterToolbarProps {
  statusFilter: AgreementStatusFilter;
  onStatusFilterChange: (filter: AgreementStatusFilter) => void;
  conditionalFilter: boolean;
  onConditionalFilterChange: (value: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface AgreementsTableProps {
  agreements: FundingAgreement[];
  programmes: Programme[];
  disbursements: Disbursement[];
  isLoading: boolean;
  error: string | null;
  onRowClick: (agreement: FundingAgreement) => void;
  onVerify: (agreement: FundingAgreement) => void;
  canVerify: boolean;
}

interface CreateAgreementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAgreementPayload) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
}

interface AgreementDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: FundingAgreement | null;
  programmes: Programme[];
  disbursements: Disbursement[];
}

// ─── Constants ───

const STATUS_OPTIONS: { value: AgreementStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
];

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
  conditionalFilter,
  onConditionalFilterChange,
  searchQuery,
  onSearchChange,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 p-4 bg-surface border border-default rounded-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by partner NGO, programme, or reference…"
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={conditionalFilter}
            onChange={(e) => onConditionalFilterChange(e.target.checked)}
            className="w-4 h-4 text-brand-500 border-default rounded focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-secondary">Conditional Release Only</span>
        </label>
      </div>
    </div>
  );
}

// ─── Agreements Table Component ───

function AgreementsTable({
  agreements,
  programmes,
  disbursements,
  isLoading,
  error,
  onRowClick,
  onVerify,
  canVerify,
}: AgreementsTableProps) {
  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Agreement Reference & Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Partner Organisation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Linked Programme</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Sanctioned Cap (INR)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Release Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-default">
                  <td className="px-4 py-4"><div className="h-4 w-32 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4 text-right"><div className="h-5 w-28 skeleton rounded mx-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-32 skeleton rounded"></div></td>
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

  if (agreements.length === 0) {
    return (
      <div className="p-12 text-center card">
        <FileText className="w-16 h-16 text-brand-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink mb-1">No agreements found</h3>
        <p className="text-muted">Try adjusting your filters or create a new agreement.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Agreement Reference & Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Partner Organisation</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Linked Programme</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Sanctioned Cap (INR)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Release Mode</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {agreements.map((agreement) => {
              const programme = programmes.find((p) => p.id === agreement.id);
              const agreementDisbursements = disbursements.filter(
                (d) => d.funding_agreement_id === agreement.id
              );
              const totalSanctioned = agreementDisbursements.reduce((sum, d) => sum + toAmount(d.amount), 0);

              return (
              <tr
                key={agreement.id}
                onClick={() => onRowClick(agreement)}
                className="hover:bg-brand-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-ink text-sm">{agreement.agreement_code}</p>
                    <p className="text-xs text-muted font-mono tabular-nums mt-0.5">Agreement ID: {truncateId(agreement.id, 12)}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-ink text-sm">
                        {agreement.funder_organisation_id
                          ? `Org: ${truncateId(agreement.funder_organisation_id, 8)}`
                          : 'Direct Funding'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-ink text-sm">
                      {programme ? programme.name : agreement.id ? truncateId(agreement.id, 8) : '—'}
                    </p>
                    {programme && (
                      <p className="text-xs text-muted mt-0.5">{programme.programme_code}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <p className="font-mono tabular-nums text-lg font-semibold text-ink">
                    {totalSanctioned > 0 ? formatINR(totalSanctioned) : '—'}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    agreement.conditional_disbursement_allowed
                      ? 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                  }`}>
                    {agreement.conditional_disbursement_allowed ? (
                      <>
                        <Lock className="w-3 h-3" />
                        Conditional Release
                      </>
                    ) : (
                      'Standard'
                    )}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={getStatusBadgeClass(agreement.status as any)}>
                    {agreement.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    {canVerify && agreement.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onVerify(agreement); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Verify
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRowClick(agreement); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
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

// ─── Create Agreement Drawer ───

function CreateAgreementDrawer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  submitError,
}: CreateAgreementDrawerProps) {
  const [formData, setFormData] = useState<CreateAgreementPayload>({
    agreement_code: '',
    funder_organisation_id: '',
    conditional_disbursement_allowed: false,
    starts_on: '',
    ends_on: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CreateAgreementPayload, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.agreement_code.trim()) newErrors.agreement_code = 'Agreement reference is required';
    if (!formData.funder_organisation_id?.trim()) newErrors.funder_organisation_id = 'Partner organisation is required';
    if (!formData.starts_on) newErrors.starts_on = 'Start date is required';
    if (!formData.ends_on) newErrors.ends_on = 'End date is required';
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} aria-hidden="true" />
      <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-xl shadow-xl transform transition-transform sm:my-8 sm:mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-default sticky top-0 bg-white rounded-t-2xl sm:rounded-t-xl z-10">
          <h2 className="text-lg font-semibold text-ink">Create Funding Agreement</h2>
          <button type="button" onClick={onClose} className="p-2 text-muted hover:text-secondary rounded-lg hover:bg-brand-50 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form id="create-agreement-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Compliance Banner for Conditional Release */}
          <div className="flex items-start gap-3 p-4 rounded-lg border bg-brand-50 border-brand-200 text-brand-700">
            <Shield className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Compliance Notice (ER-03)</p>
              <p className="text-xs text-brand-600 mt-1">
                Conditional disbursements remain blocked until this agreement is <strong>VERIFIED</strong>.
                The agreement must have conditional release enabled and pass independent verification
                before any conditional funds can be released.
              </p>
            </div>
          </div>

          {submitError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-error-50 border-error-200 text-error-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1"><p className="text-sm font-medium">{submitError}</p></div>
            </div>
          )}

          <div>
            <label className="label label-required">Agreement Reference / Code</label>
            <input
              type="text"
              value={formData.agreement_code}
              onChange={(e) => handleChange('agreement_code', e.target.value.toUpperCase())}
              placeholder="e.g., FUND-2024-001"
              className={`input font-mono ${errors.agreement_code ? 'input-error' : ''}`}
              maxLength={50}
            />
            {errors.agreement_code && <p className="form-error">{errors.agreement_code}</p>}
          </div>

          <div>
            <label className="label label-required">Partner Organisation</label>
            <input
              type="text"
              value={formData.funder_organisation_id}
              onChange={(e) => handleChange('funder_organisation_id', e.target.value)}
              placeholder="Partner organisation UUID"
              className={`input font-mono ${errors.funder_organisation_id ? 'input-error' : ''}`}
            />
            {errors.funder_organisation_id && <p className="form-error">{errors.funder_organisation_id}</p>}
          </div>

          <div>
            <label className="label">Linked Programme</label>
            <select
              value=""
              onChange={() => {}}
              className="input"
              disabled
            >
              <option value="">Programme linking handled separately</option>
            </select>
            <p className="form-hint">Programme association is managed through disbursements and funding agreement relations.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label label-required">Validity Start Date</label>
              <input
                type="date"
                value={formData.starts_on}
                onChange={(e) => handleChange('starts_on', e.target.value)}
                className={`input ${errors.starts_on ? 'input-error' : ''}`}
              />
              {errors.starts_on && <p className="form-error">{errors.starts_on}</p>}
            </div>
            <div>
              <label className="label label-required">Validity End Date</label>
              <input
                type="date"
                value={formData.ends_on}
                onChange={(e) => handleChange('ends_on', e.target.value)}
                className={`input ${errors.ends_on ? 'input-error' : ''}`}
              />
              {errors.ends_on && <p className="form-error">{errors.ends_on}</p>}
            </div>
          </div>

          <div className="border-t border-default pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.conditional_disbursement_allowed}
                onChange={(e) => handleChange('conditional_disbursement_allowed', e.target.checked)}
                className="w-4 h-4 text-brand-500 border-default rounded focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-secondary">Enable Conditional Release</span>
            </label>
            <p className="mt-1 text-xs text-muted ml-7">
              Funds will be held until agreement conditions are met and independently verified.
            </p>
          </div>
        </form>

        <div className="drawer-footer">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="create-agreement-form" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <> <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Creating… </>
            ) : (
              'Create Agreement'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Agreement Detail Drawer ───

function AgreementDetailDrawer({
  isOpen,
  onClose,
  agreement,
  programmes,
  disbursements,
}: AgreementDetailDrawerProps) {
  if (!isOpen || !agreement) return null;

  const programme = programmes.find((p) => p.id === agreement.id);
  const agreementDisbursements = disbursements.filter(
    (d) => d.funding_agreement_id === agreement.id
  );
  const totalDisbursed = agreementDisbursements
    .filter((d) => d.status === 'PAID')
    .reduce((sum, d) => sum + toAmount(d.amount), 0);
  const conditionalReleases = agreementDisbursements.filter((d) => d.conditional_release);
  const pendingVerifications = agreementDisbursements.filter(
    (d) => d.conditional_release && d.status !== 'PAID' && d.status !== 'REJECTED'
  );

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-surface border-l border-default shadow-xl flex flex-col animate-slideInRight">
        <div className="flex items-center justify-between p-4 border-b border-default bg-brand-600 text-white">
          <div>
            <h2 className="text-lg font-semibold">Agreement Details</h2>
            <p className="text-sm text-white/70 font-mono tabular-nums">{agreement.agreement_code}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Agreement Overview */}
          <div className="bg-canvas rounded-lg p-4 border border-default">
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              Overview
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Reference</dt>
                <dd className="font-medium mt-0.5">{agreement.agreement_code}</dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="font-medium mt-0.5">
                  <span className={getStatusBadgeClass(agreement.status as any)}>{agreement.status}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Partner Organisation</dt>
                <dd className="font-medium mt-0.5 font-mono tabular-nums">
                  {agreement.funder_organisation_id || 'Direct Funding'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Linked Programme</dt>
                <dd className="font-medium mt-0.5">
                  {programme ? programme.name : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Release Mode</dt>
                <dd className="font-medium mt-0.5 flex items-center gap-1">
                  {agreement.conditional_disbursement_allowed ? (
                    <>
                      <Lock className="w-3 h-3 text-brand-500" />
                      <span className="text-brand-500">Conditional Release</span>
                    </>
                  ) : (
                    <span className="text-muted">Standard</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Validity Period</dt>
                <dd className="font-medium mt-0.5">
                  {agreement.starts_on ? formatShortDate(agreement.starts_on) : '—'} —{' '}
                  {agreement.ends_on ? formatShortDate(agreement.ends_on) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Created</dt>
                <dd className="font-medium mt-0.5">{formatShortDate(agreement.created_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              title="Total Sanctioned (INR)"
              value={totalDisbursed > 0 ? formatINR(totalDisbursed) : '—'}
              color="secondary"
              icon={<DollarSign className="w-5 h-5" />}
            />
            <SummaryCard
              title="Conditional Releases"
              value={conditionalReleases.length}
              subtitle={pendingVerifications.length > 0 ? `${pendingVerifications.length} pending` : 'All cleared'}
              color="warning"
              icon={<Lock className="w-5 h-5" />}
            />
            <SummaryCard
              title="Disbursement Count"
              value={agreementDisbursements.length}
              color="primary"
              icon={<FileText className="w-5 h-5" />}
            />
          </div>

          {/* Conditional Release Compliance Note */}
          {agreement.conditional_disbursement_allowed && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-brand-50 border-brand-200 text-brand-700">
              <Flag className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Conditional Release Gate (ER-03)</p>
                <p className="text-xs text-brand-600 mt-1">
                  This agreement permits conditional disbursements. Funds tagged as conditional release
                  will remain blocked until the agreement status is <strong>VERIFIED</strong> and all
                  milestone conditions are independently confirmed.
                </p>
              </div>
            </div>
          )}

          {/* Disbursements Linked to Agreement */}
          <div>
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-500" />
              Linked Disbursements
            </h3>
            {agreementDisbursements.length === 0 ? (
              <div className="p-6 text-center bg-canvas border border-default rounded-lg">
                <DollarSign className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                <p className="text-muted">No disbursements linked to this agreement.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {agreementDisbursements.slice(0, 5).map((disbursement) => (
                  <div key={disbursement.id} className="flex items-center justify-between p-3 bg-white border border-default rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success-50 text-success-600">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-ink text-sm">{truncateId(disbursement.id, 12)}</p>
                        <p className="text-xs text-muted">{disbursement.recipient_kind.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono tabular-nums text-sm font-semibold text-ink">{formatINR(disbursement.amount)}</p>
                      <span className={getStatusBadgeClass(disbursement.status as any)}>{displayStatus(disbursement.status)}</span>
                    </div>
                  </div>
                ))}
                {agreementDisbursements.length > 5 && (
                  <p className="text-sm text-muted text-center">…and {agreementDisbursements.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function displayStatus(status: string): string {
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
    default:
      return status;
  }
}

// ─── Main Agreements Page ───

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<FundingAgreement[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<AgreementStatusFilter>('ALL');
  const [conditionalFilter, setConditionalFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<FundingAgreement | null>(null);
  const [agreementToVerify, setAgreementToVerify] = useState<FundingAgreement | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Role-based permissions
  const userRole = 'ORG_ADMIN';
  const canCreate = userRole === 'ORG_ADMIN' || userRole === 'FINANCE_OFFICER';
  const canVerify = userRole === 'ORG_ADMIN' || userRole === 'SUPERVISOR';

  // Computed summary
  const summary = useMemo(() => {
    const totalAgreements = agreements.length;
    const verifiedActive = agreements.filter((a) => a.status === 'VERIFIED').length;
    const pendingVerification = agreements.filter((a) => a.status === 'PENDING').length;
    const conditionalGated = agreements.filter((a) => a.conditional_disbursement_allowed).length;

    return {
      totalAgreements,
      verifiedActive,
      pendingVerification,
      conditionalGated,
    };
  }, [agreements]);

  // Filtered agreements
  const filteredAgreements = useMemo(() => {
    return agreements.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (conditionalFilter && !a.conditional_disbursement_allowed) return false;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (
          !a.agreement_code.toLowerCase().includes(searchLower) &&
          !(a.funder_organisation_id || '').toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [agreements, statusFilter, conditionalFilter, searchQuery]);

  // ─── Data Fetching ───

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [agreementsRes, programmesRes, disbursementsRes] = await Promise.all([
        api.agreements.list(),
        api.programmes.list(),
        api.disbursements.list({ page: 1, limit: 200 }),
      ]);
      setAgreements(agreementsRes);
      setProgrammes(programmesRes);
      setDisbursements(disbursementsRes);
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

  const handleCreate = async (data: CreateAgreementPayload) => {
    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      await api.agreements.create(data);
      await fetchAllData();
      setCreateError(null);
    } catch (err) {
      setCreateError(toApiErrorMessage(err));
      throw err;
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleVerify = async (agreement: FundingAgreement) => {
    setAgreementToVerify(agreement);
    setIsVerifyModalOpen(true);
  };

  const confirmVerify = async (newStatus: VerifyAgreementPayload['status']) => {
    if (!agreementToVerify) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      await api.agreements.verify(agreementToVerify.id, {
        status: newStatus,
        conditional_disbursement_allowed: agreementToVerify.conditional_disbursement_allowed,
      });
      await fetchAllData();
      setIsVerifyModalOpen(false);
      setAgreementToVerify(null);
    } catch (err) {
      setVerifyError(toApiErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleViewDetail = (agreement: FundingAgreement) => {
    setSelectedAgreement(agreement);
    setIsDetailOpen(true);
  };

  // ─── Render ───

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="container py-8">
        {/* Page Header & Primary Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-ink tracking-tight">Funding Agreements</h1>
            <p className="mt-1 text-sm text-muted">Sub-grant contracts and conditional disbursement release gates</p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => { setCreateError(null); setIsCreateOpen(true); }}
              disabled={isSubmittingCreate}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              New Agreement
            </button>
          )}
        </div>

        {/* 4-Card KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Total Agreements"
            value={summary.totalAgreements}
            color="primary"
            icon={<FileText className="w-5 h-5" />}
          />
          <SummaryCard
            title="Verified & Active"
            value={summary.verifiedActive}
            color="success"
            icon={<CheckCircle className="w-5 h-5" />}
          />
          <SummaryCard
            title="Pending Verification"
            value={summary.pendingVerification}
            color="warning"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <SummaryCard
            title="Conditional Release Gated"
            value={summary.conditionalGated}
            color="secondary"
            icon={<Lock className="w-5 h-5" />}
          />
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mb-6">
          <FilterToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            conditionalFilter={conditionalFilter}
            onConditionalFilterChange={setConditionalFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Agreements Ledger Table */}
        <AgreementsTable
          agreements={filteredAgreements}
          programmes={programmes}
          disbursements={disbursements}
          isLoading={isLoading}
          error={error}
          onRowClick={handleViewDetail}
          onVerify={handleVerify}
          canVerify={canVerify}
        />

        {/* Create Agreement Drawer */}
        <CreateAgreementDrawer
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmittingCreate}
          submitError={createError}
        />

        {/* Agreement Detail Drawer */}
        <AgreementDetailDrawer
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedAgreement(null); }}
          agreement={selectedAgreement}
          programmes={programmes}
          disbursements={disbursements}
        />

        {/* Verify Agreement Modal */}
        {isVerifyModalOpen && agreementToVerify && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsVerifyModalOpen(false)} aria-hidden="true" />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
              <h2 className="text-lg font-semibold text-ink mb-2">Verify Agreement</h2>
              <p className="text-sm text-muted mb-6">
                Update verification status for <span className="font-mono tabular-nums text-brand-500">{agreementToVerify.agreement_code}</span>
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => confirmVerify('VERIFIED')}
                  disabled={isVerifying}
                  className="w-full btn-success"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as VERIFIED
                </button>
                <button
                  type="button"
                  onClick={() => confirmVerify('REJECTED')}
                  disabled={isVerifying}
                  className="w-full btn-danger"
                >
                  <XCircle className="w-4 h-4" />
                  Mark as REJECTED
                </button>
              </div>

              {verifyError && (
                <div className="mt-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
                  {verifyError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsVerifyModalOpen(false); setAgreementToVerify(null); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}