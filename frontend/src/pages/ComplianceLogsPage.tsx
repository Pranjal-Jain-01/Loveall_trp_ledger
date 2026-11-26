import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  Lock,
  FileText,
  Hash,
  Building2,
  Users,
  DollarSign,
  AlertCircle,
  Search,
  Globe,
} from 'lucide-react';
import { toApiErrorMessage } from '../services/api';
import {
  formatShortDate,
  formatDate,
  truncateId,
} from '../utils/formatters';
import type { LedgerEvent } from '../types/disbursements';

// ─── Types ───

interface StatutoryRegistration {
  id: string;
  registration_type: '12AB' | '80G' | 'CSR1' | 'FCRA';
  registration_number: string;
  issued_on: string;
  expires_on: string | null;
  status: 'VERIFIED' | 'PENDING' | 'EXPIRED' | 'REJECTED';
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

interface ComplianceRule {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

interface ComplianceEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  actor_role: string;
  description: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

interface ChainVerificationResult {
  valid: boolean;
  details: string;
  checked_at: string;
  total_events: number;
  verified_events: number;
  failed_events: number;
}

interface StatutoryCardProps {
  registration: StatutoryRegistration;
}

interface FilterToolbarProps {
  eventTypeFilter: string;
  onEventTypeFilterChange: (filter: string) => void;
  entityTypeFilter: string;
  onEntityTypeFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  eventTypes: string[];
  entityTypes: string[];
}

interface EventsTableProps {
  events: ComplianceEvent[];
  isLoading: boolean;
  error: string | null;
}

interface ChainVerificationBannerProps {
  result: ChainVerificationResult | null;
  isVerifying: boolean;
  onDismiss: () => void;
}

// ─── Constants ───

const STATUTORY_TYPES = ['12AB', '80G', 'CSR1', 'FCRA'] as const;

const COMPLIANCE_RULES = [
  { code: 'FCRA_BLOCK', name: 'FCRA Foreign→Partner Block', description: 'Blocks foreign-sourced funds from being sub-granted to partner NGOs' },
  { code: 'CONDITIONAL_GATE', name: 'Conditional Agreement Gate', description: 'Requires VERIFIED agreement for conditional disbursement release (ER-03)' },
  { code: 'UTR_REQUIRED', name: 'UTR Payment Ref Required', description: 'Mandatory payment reference for all executed disbursements' },
  { code: 'NON_SELF_ATTEST', name: 'Non-Self-Attestation Rule', description: 'Prevents self-attestation of compliance checks by same role' },
  { code: 'CONTRIBUTION_IMMUTABLE', name: 'Contribution Immutability', description: 'Ensures donor contributions are tamper-evident via ledger' },
];

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

// ─── Statutory Registration Card ───

function StatutoryCard({ registration }: StatutoryCardProps) {
  const isExpired = registration.expires_on && new Date(registration.expires_on) < new Date();
  const status = isExpired ? 'EXPIRED' : registration.status;
  const daysUntilExpiry = registration.expires_on
    ? Math.ceil((new Date(registration.expires_on).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-success-50 text-success-700 border-success-100';
      case 'PENDING': return 'bg-warning-50 text-warning-700 border-warning-100';
      case 'EXPIRED': return 'bg-error-50 text-error-700 border-error-100';
      case 'REJECTED': return 'bg-error-50 text-error-700 border-error-100';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case '12AB': return <Building2 className="w-5 h-5" />;
      case '80G': return <DollarSign className="w-5 h-5" />;
      case 'CSR1': return <Users className="w-5 h-5" />;
      case 'FCRA': return <Globe className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white border border-default rounded-xl p-4 hover:border-brand-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-brand-50 text-brand-600">
            {getTypeIcon(registration.registration_type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink text-lg">{registration.registration_type}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
            <p className="text-sm text-muted mt-1 font-mono tabular-nums">{registration.registration_number}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted">Issued</p>
          <p className="font-mono text-sm text-ink">{formatShortDate(registration.issued_on)}</p>
          {registration.expires_on && (
            <>
              <p className="text-xs text-muted mt-2">Expires</p>
              <p className={`font-mono text-sm ${daysUntilExpiry !== null && daysUntilExpiry < 30 ? 'text-warning-600' : 'text-ink'}`}>
                {formatShortDate(registration.expires_on)}
                {daysUntilExpiry !== null && (
                  <span className="ml-2 text-xs text-muted">({daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : 'Expired'})</span>
                )}
              </p>
            </>
          )}
        </div>
      </div>
      {registration.verified_by && (
        <div className="mt-3 pt-3 border-t border-default flex items-center justify-between text-xs">
          <span className="text-muted">Verified by: <span className="font-mono text-ink">{truncateId(registration.verified_by)}</span></span>
          <span className="text-muted">{registration.verified_at ? formatShortDate(registration.verified_at) : ''}</span>
        </div>
      )}
    </div>
  );
}

// ─── Filter Toolbar Component ───

function FilterToolbar({
  eventTypeFilter,
  onEventTypeFilterChange,
  entityTypeFilter,
  onEntityTypeFilterChange,
  searchQuery,
  onSearchChange,
  eventTypes,
  entityTypes,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 p-4 bg-surface border border-default rounded-xl">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search by actor, resource, or description…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={eventTypeFilter}
          onChange={(e) => onEventTypeFilterChange(e.target.value)}
          className="input w-auto min-w-[180px]"
        >
          <option value="">All Event Types</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <select
          value={entityTypeFilter}
          onChange={(e) => onEntityTypeFilterChange(e.target.value)}
          className="input w-auto min-w-[180px]"
        >
          <option value="">All Entity Types</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Events Table Component ───

function EventsTable({
  events,
  isLoading,
  error,
}: EventsTableProps) {
  const getEventTypeBadge = (type: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
    if (type.includes('VERIFY') || type.includes('APPROVE')) return `${base} bg-success-50 text-success-700 border-success-100`;
    if (type.includes('REJECT') || type.includes('BLOCK')) return `${base} bg-error-50 text-error-700 border-error-100`;
    if (type.includes('CREATE') || type.includes('PROPOSE')) return `${base} bg-brand-50 text-brand-700 border-brand-100`;
    if (type.includes('PAY') || type.includes('EXECUTE')) return `${base} bg-info-50 text-info-700 border-info-100`;
    return `${base} bg-neutral-100 text-neutral-700 border-neutral-200`;
  };

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brand-600 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actor & Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Target Resource</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Ledger Hash</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-default">
                  <td className="px-4 py-4"><div className="h-4 w-28 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-5 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-32 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-48 skeleton rounded"></div></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 skeleton rounded"></div></td>
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

  if (events.length === 0) {
    return (
      <div className="p-12 text-center card">
        <FileText className="w-16 h-16 text-brand-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-ink mb-1">No compliance events found</h3>
        <p className="text-muted">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-brand-600 text-white">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Event Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Actor & Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Target Resource</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Ledger Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-mono tabular-nums text-sm text-ink">{formatDate(event.occurred_at)}</p>
                    <p className="text-xs text-muted font-mono">{truncateId(event.id, 12)}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={getEventTypeBadge(event.event_type)}>
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium text-ink text-sm">{truncateId(event.actor_id, 8)}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                      {event.actor_role.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-sm text-ink">
                    {event.entity_type.replace('_', ' ')}: {truncateId(event.entity_id, 12)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm text-secondary max-w-xs truncate" title={event.description}>
                    {event.description}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <code className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded break-all">
                    {event.metadata.ledger_hash ? truncateId(event.metadata.ledger_hash as string, 16) : '—'}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Chain Verification Banner ───

function ChainVerificationBanner({
  result,
  isVerifying,
  onDismiss,
}: ChainVerificationBannerProps) {
  if (!result && !isVerifying) return null;

  if (isVerifying) {
    return (
      <div className="flex items-center gap-4 p-4 bg-brand-50 border border-brand-200 rounded-xl">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        <div className="flex-1">
          <p className="font-medium text-brand-700">Verifying ledger chain integrity…</p>
          <p className="text-sm text-brand-600">Checking SHA-256 hash chain and Ed25519 signatures across all events</p>
        </div>
        <button onClick={onDismiss} className="p-2 text-brand-500 hover:bg-brand-100 rounded-lg">
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const isValid = result?.valid;
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${
      isValid
        ? 'bg-success-50 border-success-200 text-success-800'
        : 'bg-error-50 border-error-200 text-error-800'
    }`}>
      <div className={`p-2 rounded-lg ${isValid ? 'bg-success-100 text-success-600' : 'bg-error-100 text-error-600'}`}>
        {isValid ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
      </div>
      <div className="flex-1">
        <p className="font-medium">{isValid ? '✅ Chain Verification PASSED — 100% Valid' : '❌ Chain Verification FAILED'}</p>
        <p className="text-sm mt-1">{result?.details}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-xs">
          <span>Total Events: <span className="font-mono tabular-nums">{result?.total_events}</span></span>
          <span>Verified: <span className="font-mono tabular-nums text-success-600">{result?.verified_events}</span></span>
          <span>Failed: <span className="font-mono tabular-nums text-error-600">{result?.failed_events}</span></span>
          <span>Checked: <span className="font-mono">{formatDate(result?.checked_at || '')}</span></span>
        </div>
      </div>
      <button onClick={onDismiss} className="p-2 hover:bg-black/5 rounded-lg">
        <XCircle className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Main Compliance Logs Page ───

export default function ComplianceLogsPage() {
  const [registrations, setRegistrations] = useState<StatutoryRegistration[]>([]);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainResult, setChainResult] = useState<ChainVerificationResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Role-based permissions
  const userRole = 'ORG_ADMIN';
  const canVerifyChain = userRole === 'ORG_ADMIN' || userRole === 'AUDITOR' || userRole === 'INDEPENDENT_VERIFIER';

  // Computed summary
  const summary = useMemo(() => {
    const verifiedCerts = registrations.filter((r) => r.status === 'VERIFIED').length;
    const activeRules = complianceRules.filter((r) => r.is_active).length;
    const totalLedgerEvents = ledgerEvents.length;

    return {
      statutoryCertificates: verifiedCerts,
      activeComplianceRules: activeRules,
      recordedLedgerEvents: totalLedgerEvents,
      chainIntegrity: chainResult?.valid ? 'Verified — SHA-256 + Ed25519' : 'Not Verified',
    };
  }, [registrations, complianceRules, ledgerEvents, chainResult]);

  // Extract unique event/entity types for filters
  const eventTypes = useMemo(() => [...new Set(events.map((e) => e.event_type))].sort(), [events]);
  const entityTypes = useMemo(() => [...new Set(events.map((e) => e.entity_type))].sort(), [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (eventTypeFilter && e.event_type !== eventTypeFilter) return false;
      if (entityTypeFilter && e.entity_type !== entityTypeFilter) return false;
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (
          !e.description.toLowerCase().includes(searchLower) &&
          !e.actor_id.toLowerCase().includes(searchLower) &&
          !e.entity_id.toLowerCase().includes(searchLower) &&
          !e.event_type.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [events, eventTypeFilter, entityTypeFilter, searchQuery]);

  // ─── Data Fetching ───

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch statutory registrations
      const regResponse = await fetch('/api/v1/organisations/current/registrations', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (regResponse.ok) {
        const regData = await regResponse.json();
        setRegistrations(regData.data || regData);
      }

      // Fetch compliance rules
      const rulesResponse = await fetch('/api/v1/compliance-rules', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setComplianceRules(rulesData.data || rulesData);
      }

      // Fetch ledger events for chain verification and event trail
      const ledgerResponse = await fetch('/api/v1/ledger/events?limit=500', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (ledgerResponse.ok) {
        const ledgerData = await ledgerResponse.json();
        const ledger = (ledgerData.data || ledgerData) as LedgerEvent[];
        setLedgerEvents(ledger);

        // Transform ledger events to compliance events
        const complianceEvents: ComplianceEvent[] = ledger.map((le) => ({
          id: le.id,
          event_type: le.event_kind,
          entity_type: le.source_table || 'unknown',
          entity_id: le.source_id || 'unknown',
          actor_id: le.created_by || 'system',
          actor_role: 'SYSTEM', // Would come from user lookup
          description: `Ledger event: ${le.event_kind}`,
          metadata: { ...le.event_payload, ledger_hash: le.event_hash },
          occurred_at: le.occurred_at,
          created_at: le.created_at,
        }));
        setEvents(complianceEvents);
      }
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

  const handleVerifyChain = async () => {
    setIsVerifyingChain(true);
    setChainResult(null);
    try {
      const response = await fetch('/api/v1/ledger/verify-chain', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Verification failed');
      const result = await response.json();
      setChainResult(result);
    } catch (err) {
      setChainResult({
        valid: false,
        details: toApiErrorMessage(err),
        checked_at: new Date().toISOString(),
        total_events: ledgerEvents.length,
        verified_events: 0,
        failed_events: ledgerEvents.length,
      });
    } finally {
      setIsVerifyingChain(false);
    }
  };

  const dismissChainResult = () => {
    setChainResult(null);
  };

  // ─── Render ───

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="container py-8">
        {/* Page Header & Primary Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-ink tracking-tight">Compliance Logs & Statutory Guardrails</h1>
            <p className="mt-1 text-sm text-muted">
              Automated policy enforcement trail, statutory certificates, and cryptographic verification
            </p>
          </div>
          {canVerifyChain && (
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={isVerifyingChain}
              className="btn-primary"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifyingChain ? 'animate-spin' : ''}`} />
              Verify Ledger Chain
            </button>
          )}
        </div>

        {/* Chain Verification Banner */}
        <ChainVerificationBanner
          result={chainResult}
          isVerifying={isVerifyingChain}
          onDismiss={dismissChainResult}
        />

        {/* 4-Card KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Statutory Certificates"
            value={summary.statutoryCertificates}
            subtitle="12AB • 80G • CSR1 • FCRA"
            color="primary"
            icon={<FileText className="w-5 h-5" />}
          />
          <SummaryCard
            title="Active Compliance Rules"
            value={summary.activeComplianceRules}
            subtitle="Enabled guardrails"
            color="secondary"
            icon={<Shield className="w-5 h-5" />}
          />
          <SummaryCard
            title="Recorded Ledger Events"
            value={summary.recordedLedgerEvents}
            subtitle="Tamper-evident trail"
            color="warning"
            icon={<Hash className="w-5 h-5" />}
          />
          <SummaryCard
            title="Chain Integrity"
            value={summary.chainIntegrity}
            color="success"
            icon={<Lock className="w-5 h-5" />}
          />
        </div>

        {/* Top Strip — Statutory Registrations & Enforced Guardrails */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Card: Statutory Registrations */}
          <div className="bg-surface border border-default rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-500" />
                Statutory Registrations
              </h2>
              <span className="text-xs text-muted">Certificates & Expiry Tracking</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {registrations.length > 0 ? (
                registrations.map((reg) => <StatutoryCard key={reg.id} registration={reg} />)
              ) : (
                STATUTORY_TYPES.map((type) => (
                  <div key={type} className="bg-white border border-default rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-neutral-100 text-neutral-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-ink text-lg">{type}</span>
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-neutral-100 text-neutral-700 border-neutral-200">
                          Not Registered
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted mt-2 ml-10">No registration recorded</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Card: Enforced Compliance Rules */}
          <div className="bg-surface border border-default rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-500" />
                Enforced Compliance Rules
              </h2>
              <span className="text-xs text-muted">Active Guardrails</span>
            </div>
            <div className="space-y-3">
              {COMPLIANCE_RULES.map((rule) => {
                const dbRule = complianceRules.find((r) => r.code === rule.code);
                const isActive = dbRule?.is_active ?? true;
                return (
                  <div key={rule.code} className="flex items-center justify-between p-3 bg-white border border-default rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-success-50 text-success-600' : 'bg-neutral-100 text-neutral-600'}`}>
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-ink text-sm">{rule.name}</p>
                        <p className="text-xs text-muted">{rule.description}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      isActive
                        ? 'bg-success-50 text-success-700 border-success-100'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                    }`}>
                      {isActive ? 'ENFORCED' : 'INACTIVE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mb-6">
          <FilterToolbar
            eventTypeFilter={eventTypeFilter}
            onEventTypeFilterChange={setEventTypeFilter}
            entityTypeFilter={entityTypeFilter}
            onEntityTypeFilterChange={setEntityTypeFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            eventTypes={eventTypes}
            entityTypes={entityTypes}
          />
        </div>

        {/* Bottom Table — Compliance & Audit Event Trail */}
        <div>
          <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
            <Hash className="w-5 h-5 text-brand-500" />
            Compliance & Audit Event Trail
          </h2>
          <EventsTable
            events={filteredEvents}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}