import { useState, useEffect, useCallback, useMemo, type FormEvent, type ReactNode } from 'react';
import {
  Plus,
  Search,
  BarChart2,
  FileText,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Shield,
  XCircle,
  Loader2,
  Lock,
  DollarSign,
  Calendar,
  Target,
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
  Programme,
  FundingAgreement,
  Disbursement,
  CreateProgrammePayload,
} from '../types/disbursements';

// ─── Types ───

type ProgrammeStatusFilter = 'ALL' | 'ACTIVE' | 'DRAFT' | 'COMPLETED';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'primary' | 'secondary' | 'warning' | 'success';
}

interface FilterToolbarProps {
  statusFilter: ProgrammeStatusFilter;
  onStatusFilterChange: (filter: ProgrammeStatusFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface ProgrammesTableProps {
  programmes: Programme[];
  disbursements: Disbursement[];
  isLoading: boolean;
  error: string | null;
  onRowClick: (programme: Programme) => void;
}

interface CreateProgrammeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProgrammePayload) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
}

interface ProgrammeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  programme: Programme | null;
  agreements: FundingAgreement[];
  disbursements: Disbursement[];
}

// ─── Constants ───

const STATUS_OPTIONS: { value: ProgrammeStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'COMPLETED', label: 'Completed' },
];

const PURPOSE_OPTIONS = [
  { value: 'FOOD', label: 'Food' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'BIO_DIVERSITY', label: 'Biodiversity' },
  { value: 'OPERATIONS', label: 'Operations' },
];

function getProgrammeStatus(programme: Programme): ProgrammeStatusFilter {
  if (!programme.is_active) return 'DRAFT';
  return 'ACTIVE';
}

function displayStatus(status: ProgrammeStatusFilter): string {
  return status;
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
  searchQuery,
  onSearchChange,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 p-4 bg-surface border border-default rounded-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by programme name or code…"
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
    </div>
  );
}

// ─── Programmes Table Component ───

function ProgrammesTable({
  programmes,
  disbursements,
  isLoading,
  error,
  onRowClick,
}: ProgrammesTableProps) {
  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Programme Name & Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Focus Sector</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Sanctioned Budget (INR)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Utilized / Disbursed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-default">
                  <td className="px-4 py-4"><div className="h-4 w-32 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4 text-right"><div className="h-5 w-28 skeleton rounded mx-auto"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-48 skeleton rounded"></div></td>
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

  if (programmes.length === 0) {
    return (
      <div className="p-12 text-center card">
        <BarChart2 className="w-16 h-16 text-brand-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink mb-1">No programmes found</h3>
        <p className="text-muted">Try adjusting your filters or create a new programme.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Programme Name & Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Focus Sector / Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Sanctioned Budget (INR)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Utilized / Disbursed</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {programmes.map((programme) => {
              // Calculate utilized amount from disbursements
              const programmeDisbursements = disbursements.filter(
                (d) => d.programme_id === programme.id && d.status === 'PAID'
              );
              const utilizedAmount = programmeDisbursements.reduce((sum, d) => sum + toAmount(d.amount), 0);
              const sanctionedBudget = toAmount(0); // Programmes don't have budget in current schema, could be extended
              const utilizationPercent = sanctionedBudget > 0 ? (utilizedAmount / sanctionedBudget) * 100 : 0;

              return (
              <tr
                key={programme.id}
                onClick={() => onRowClick(programme)}
                className="hover:bg-brand-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-ink text-sm">{programme.name}</p>
                    <p className="text-xs text-muted font-mono tabular-nums mt-0.5">{programme.programme_code}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                      {programme.purpose.replace('_', ' ')}
                    </span>
                    {programme.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-1">{programme.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <p className="font-mono tabular-nums text-lg font-semibold text-ink">
                    {sanctionedBudget > 0 ? formatINR(sanctionedBudget) : '—'}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-mono tabular-nums text-sm font-medium text-ink">
                      {formatINR(utilizedAmount)}
                    </p>
                    {sanctionedBudget > 0 && (
                      <div className="mt-1.5 h-1.5 bg-brand-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 transition-all duration-300"
                          style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={getStatusBadgeClass(getProgrammeStatus(programme) === 'ACTIVE' ? 'PAID' : 'DRAFT')}>
                    {displayStatus(getProgrammeStatus(programme))}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRowClick(programme); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    View Details
                  </button>
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

// ─── Create Programme Drawer ───

function CreateProgrammeDrawer({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  submitError,
}: CreateProgrammeDrawerProps) {
  const [formData, setFormData] = useState<CreateProgrammePayload>({
    programme_code: '',
    name: '',
    purpose: 'OPERATIONS',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CreateProgrammePayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.programme_code.trim()) newErrors.programme_code = 'Programme code is required';
    if (!formData.name.trim()) newErrors.name = 'Programme name is required';
    if (!formData.purpose) newErrors.purpose = 'Focus sector is required';
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
          <h2 className="text-lg font-semibold text-ink">Create Programme</h2>
          <button type="button" onClick={onClose} className="p-2 text-muted hover:text-secondary rounded-lg hover:bg-brand-50 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form id="create-programme-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {submitError && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-error-50 border-error-200 text-error-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1"><p className="text-sm font-medium">{submitError}</p></div>
            </div>
          )}

          <div>
            <label className="label label-required">Programme Code</label>
            <input
              type="text"
              value={formData.programme_code}
              onChange={(e) => handleChange('programme_code', e.target.value.toUpperCase())}
              placeholder="e.g., EDU-2024-001"
              className={`input font-mono ${errors.programme_code ? 'input-error' : ''}`}
              maxLength={50}
            />
            {errors.programme_code && <p className="form-error">{errors.programme_code}</p>}
          </div>

          <div>
            <label className="label label-required">Programme Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Rural Education Initiative"
              className={`input ${errors.name ? 'input-error' : ''}`}
              maxLength={200}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div>
            <label className="label label-required">Focus Sector</label>
            <select
              value={formData.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              className={`input ${errors.purpose ? 'input-error' : ''}`}
            >
              {PURPOSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.purpose && <p className="form-error">{errors.purpose}</p>}
          </div>

          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the programme objectives and scope"
              className="input min-h-[80px] resize-y"
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="border-t border-default pt-4">
            <label className="label label-required">Start Date</label>
            <input type="date" className="input" />
          </div>
          <div>
            <label className="label label-required">End Date</label>
            <input type="date" className="input" />
          </div>
          <div>
            <label className="label label-required">Initial Budget Allocation (INR)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="input font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="label label-required">Status</label>
            <select className="input">
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
            </select>
          </div>
        </form>

        <div className="drawer-footer">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="create-programme-form" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <> <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> Creating… </>
            ) : (
              'Create Programme'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Programme Detail Drawer ───

function ProgrammeDetailDrawer({
  isOpen,
  onClose,
  programme,
  agreements,
  disbursements,
}: ProgrammeDetailDrawerProps) {
  if (!isOpen || !programme) return null;

  const programmeDisbursements = disbursements.filter(
    (d) => d.programme_id === programme.id
  );
  const paidDisbursements = programmeDisbursements.filter((d) => d.status === 'PAID');
  const totalDisbursed = paidDisbursements.reduce((sum, d) => sum + toAmount(d.amount), 0);
  const conditionalReleases = programmeDisbursements.filter((d) => d.conditional_release);
  const linkedAgreements = agreements.filter((a) => a.id === programme.id);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-surface border-l border-default shadow-xl flex flex-col animate-slideInRight">
        <div className="flex items-center justify-between p-4 border-b border-default bg-brand-600 text-white">
          <div>
            <h2 className="text-lg font-semibold">Programme Details</h2>
            <p className="text-sm text-white/70 font-mono tabular-nums">{programme.programme_code}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Programme Overview */}
          <div className="bg-canvas rounded-lg p-4 border border-default">
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-500" />
              Overview
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="font-medium mt-0.5">{programme.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Code</dt>
                <dd className="font-mono tabular-nums font-medium mt-0.5">{programme.programme_code}</dd>
              </div>
              <div>
                <dt className="text-muted">Focus Sector</dt>
                <dd className="font-medium mt-0.5 capitalize">{programme.purpose.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="font-medium mt-0.5">
                  <span className={getStatusBadgeClass(getProgrammeStatus(programme) === 'ACTIVE' ? 'PAID' : 'DRAFT')}>
                    {displayStatus(getProgrammeStatus(programme))}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Description</dt>
                <dd className="font-medium mt-0.5">{programme.description || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">Created</dt>
                <dd className="font-medium mt-0.5">{formatShortDate(programme.created_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              title="Linked Agreements"
              value={linkedAgreements.length}
              color="secondary"
              icon={<FileText className="w-5 h-5" />}
            />
            <SummaryCard
              title="Total Disbursed (INR)"
              value={formatINR(totalDisbursed)}
              color="primary"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <SummaryCard
              title="Conditional Releases"
              value={conditionalReleases.length}
              color="warning"
              icon={<Lock className="w-5 h-5" />}
            />
          </div>

          {/* Linked Funding Agreements */}
          <div>
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              Linked Funding Agreements
            </h3>
            {linkedAgreements.length === 0 ? (
              <div className="p-6 text-center bg-canvas border border-default rounded-lg">
                <FileText className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                <p className="text-muted">No funding agreements linked to this programme.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedAgreements.map((agreement) => (
                  <div key={agreement.id} className="flex items-center justify-between p-3 bg-white border border-default rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-ink text-sm">{agreement.agreement_code}</p>
                        <p className="text-xs text-muted">{agreement.status}</p>
                      </div>
                    </div>
                    <span className={getStatusBadgeClass(agreement.status as string)}>{agreement.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disbursements Summary */}
          <div>
            <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-500" />
              Disbursements Summary
            </h3>
            {programmeDisbursements.length === 0 ? (
              <div className="p-6 text-center bg-canvas border border-default rounded-lg">
                <DollarSign className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                <p className="text-muted">No disbursements recorded for this programme.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {programmeDisbursements.slice(0, 5).map((disbursement) => (
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
                      {/* @ts-ignore */}
                      <span className={getStatusBadgeClass(disbursement.status)}>{displayStatus(disbursement.status)}</span>
                    </div>
                  </div>
                ))}
                {programmeDisbursements.length > 5 && (
                  <p className="text-sm text-muted text-center">…and {programmeDisbursements.length - 5} more</p>
                )}
              </div>
            )}
          </div>

          {/* Field Activity Count */}
          <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-100 text-brand-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-ink">Field Activity Tracking</p>
                <p className="text-sm text-muted">Activity evidence submissions and field visits would be tracked here.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Programmes Page ───

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [agreements, setAgreements] = useState<FundingAgreement[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ProgrammeStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);

  // Role-based permissions
  const userRole = 'ORG_ADMIN';
  const canCreate = userRole === 'ORG_ADMIN' || userRole === 'SUPERVISOR';

  // Computed summary
  const summary = useMemo(() => {
    const activeProgrammes = programmes.filter((p) => p.is_active);
    const totalDisbursed = disbursements
      .filter((d) => d.status === 'PAID')
      .reduce((sum, d) => sum + toAmount(d.amount), 0);
    const conditionalHeld = disbursements
      .filter((d) => d.conditional_release && d.status !== 'PAID' && d.status !== 'REJECTED' && d.status !== 'CANCELLED')
      .length;

    return {
      activeCount: activeProgrammes.length,
      totalSanctionedBudget: 0, // Would need budget field on programme
      totalUtilized: totalDisbursed,
      availableBalance: 0, // Would need budget field
      utilizationPercent: 0,
      conditionalReleasesHeld: conditionalHeld,
    };
  }, [programmes, disbursements]);

  // Filtered programmes
  const filteredProgrammes = useMemo(() => {
    return programmes.filter((p) => {
      const progStatus = getProgrammeStatus(p);
      if (statusFilter !== 'ALL' && progStatus !== statusFilter) return false;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (
          !p.name.toLowerCase().includes(searchLower) &&
          !p.programme_code.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [programmes, statusFilter, searchQuery]);

  // ─── Data Fetching ───

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [programmesRes, agreementsRes, disbursementsRes] = await Promise.all([
        api.programmes.list(),
        api.agreements.list(),
        api.disbursements.list({ page: 1, limit: 200 }),
      ]);
      setProgrammes(programmesRes);
      setAgreements(agreementsRes);
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

  const handleCreate = async (data: CreateProgrammePayload) => {
    setIsSubmittingCreate(true);
    setCreateError(null);
    try {
      await api.programmes.create(data);
      await fetchAllData();
      setCreateError(null);
    } catch (err) {
      setCreateError(toApiErrorMessage(err));
      throw err;
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleViewDetail = (programme: Programme) => {
    setSelectedProgramme(programme);
    setIsDetailOpen(true);
  };

  // ─── Render ───

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="container py-8">
        {/* Page Header & Primary Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-ink tracking-tight">Programmes</h1>
            <p className="mt-1 text-sm text-muted">
              Organisation: <span className="font-medium text-ink">LoveAll Foundation</span>
            </p>
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={() => { setCreateError(null); setIsCreateOpen(true); }}
              disabled={isSubmittingCreate}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              New Programme
            </button>
          )}
        </div>

        {/* 4-Card KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Active Programmes"
            value={summary.activeCount}
            color="primary"
            icon={<BarChart2 className="w-5 h-5" />}
          />
          <SummaryCard
            title="Total Sanctioned Budget (INR)"
            value={summary.totalSanctionedBudget > 0 ? formatINR(summary.totalSanctionedBudget) : '—'}
            subtitle="Budget allocation per programme"
            color="secondary"
            icon={<Wallet className="w-5 h-5" />}
          />
          <SummaryCard
            title="Total Utilized / Disbursed (INR)"
            value={formatINR(summary.totalUtilized)}
            subtitle={`${summary.utilizationPercent.toFixed(1)}% utilization`}
            color="warning"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <SummaryCard
            title="Available Programme Balance (INR)"
            value={summary.availableBalance > 0 ? formatINR(summary.availableBalance) : '—'}
            color="success"
            icon={<Shield className="w-5 h-5" />}
          />
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mb-6">
          <FilterToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Programmes Table / Grid */}
        <ProgrammesTable
          programmes={filteredProgrammes}
          disbursements={disbursements}
          isLoading={isLoading}
          error={error}
          onRowClick={handleViewDetail}
        />

        {/* Create Programme Drawer */}
        <CreateProgrammeDrawer
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmittingCreate}
          submitError={createError}
        />

        {/* Programme Detail Drawer */}
        <ProgrammeDetailDrawer
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedProgramme(null); }}
          programme={selectedProgramme}
          agreements={agreements}
          disbursements={disbursements}
        />
      </div>
    </div>
  );
}