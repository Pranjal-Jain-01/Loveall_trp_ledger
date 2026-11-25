// API Client Service
const API_BASE = '/api/v1';

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
}

export class ApiError extends Error {
  status: number;
  detail?: string;
  details?: unknown;

  constructor(message: string, status: number, detail?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.details = details;
  }
}

function formatApiErrorBody(body: unknown, status: number): ApiError {
  if (!body || typeof body !== 'object') {
    return new ApiError(`Request failed (HTTP ${status})`, status);
  }

  const payload = body as Record<string, unknown>;
  const message =
    (typeof payload.error === 'string' && payload.error) ||
    (typeof payload.message === 'string' && payload.message) ||
    `Request failed (HTTP ${status})`;
  const detail = typeof payload.detail === 'string' ? payload.detail : undefined;
  const details = payload.details;

  const extra =
    Array.isArray(details)
      ? details
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'message' in item) {
              return String((item as { message: unknown }).message);
            }
            return JSON.stringify(item);
          })
          .filter(Boolean)
          .join('; ')
      : typeof details === 'string'
        ? details
        : undefined;

  const composed = [message, detail, extra].filter(Boolean).join(' — ');
  return new ApiError(composed, status, detail, details);
}

export function toApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

async function fetchJson<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  const fullUrl = buildUrl(url, params);

  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw formatApiErrorBody(errorBody, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

import type {
  FundPool,
  Programme,
  FundingAgreement,
  Disbursement,
  DisbursementDetail,
  DisbursementFilters,
  CreateDisbursementPayload,
  ApproveDisbursementPayload,
  PayDisbursementPayload,
  LedgerEvent,
  CreateFundPoolPayload,
  CreateProgrammePayload,
  CreateAgreementPayload,
  VerifyAgreementPayload,
} from '../types/disbursements';

export const api = {
  // Fund Pools
  fundPools: {
    list: async () => unwrapList<FundPool>(await fetchJson<unknown>('/fund-pools')),
    get: (id: string) => fetchJson<FundPool>(`/fund-pools/${id}`),
    create: (data: CreateFundPoolPayload) => fetchJson<FundPool>('/fund-pools', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Programmes
  programmes: {
    list: async () => unwrapList<Programme>(await fetchJson<unknown>('/programmes')),
    get: (id: string) => fetchJson<Programme>(`/programmes/${id}`),
    create: (data: CreateProgrammePayload) => fetchJson<Programme>('/programmes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Funding Agreements
  agreements: {
    list: async () => unwrapList<FundingAgreement>(await fetchJson<unknown>('/agreements')),
    get: (id: string) => fetchJson<FundingAgreement>(`/agreements/${id}`),
    create: (data: CreateAgreementPayload) => fetchJson<FundingAgreement>('/agreements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    verify: (id: string, data: VerifyAgreementPayload) => fetchJson<FundingAgreement>(`/agreements/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  },

  // Disbursements
  disbursements: {
    list: async (params?: DisbursementFilters) =>
      unwrapList<Disbursement>(
        await fetchJson<unknown>('/disbursements', {
          params: params as Record<string, string | number | boolean | undefined>,
        }),
      ),
    get: (id: string) => fetchJson<DisbursementDetail>(`/disbursements/${id}`),
    create: (data: CreateDisbursementPayload) => fetchJson<Disbursement>('/disbursements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    submit: (id: string) => fetchJson<Disbursement>(`/disbursements/${id}/submit`, {
      method: 'POST',
    }),
    approve: (id: string, data: ApproveDisbursementPayload) => fetchJson<Disbursement>(`/disbursements/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    pay: (id: string, data: PayDisbursementPayload) => fetchJson<Disbursement>(`/disbursements/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // Ledger Events
  ledger: {
    listEvents: async (params?: { source_table?: string; source_id?: string; limit?: number }) =>
      unwrapList<LedgerEvent>(
        await fetchJson<unknown>('/ledger/events', {
          params: params as Record<string, string | number | boolean | undefined>,
        }),
      ),
    getEvent: (id: string) => fetchJson<LedgerEvent>(`/ledger/events/${id}`),
    verifyChain: () => fetchJson<{ valid: boolean; details: string }>('/ledger/verify-chain'),
  },
};

// Re-export types
export type {
  FundPool,
  Programme,
  FundingAgreement,
  Disbursement,
  DisbursementDetail,
  DisbursementFilters,
  CreateDisbursementPayload,
  ApproveDisbursementPayload,
  PayDisbursementPayload,
  LedgerEvent,
  CreateFundPoolPayload,
  CreateProgrammePayload,
  CreateAgreementPayload,
  VerifyAgreementPayload,
};