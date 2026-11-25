// API Response Types for Disbursements Module

export type FundOrigin = 'DOMESTIC' | 'FOREIGN';
export type FundNature = 'CORPUS' | 'GENERAL';
export type ReceiptType = 'CSR' | 'DONATION' | 'MEMBERSHIP_FEE';
export type PurposeCategory = 'FOOD' | 'EDUCATION' | 'HEALTHCARE' | 'BIO_DIVERSITY' | 'OPERATIONS';
export type RecipientKind = 'PARTNER_NGO' | 'VENDOR' | 'EMPLOYEE' | 'BENEFICIARY' | 'OTHER';
export type DisbursementStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
export type UserRole = 'ORG_ADMIN' | 'FINANCE_OFFICER' | 'FIELD_WORKER' | 'SUPERVISOR' | 'INDEPENDENT_VERIFIER' | 'AUDITOR';
export type ComplianceResult = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | 'NOT_APPLICABLE';

export interface FundPool {
  id: string;
  pool_code: string;
  name: string;
  source_origin: FundOrigin;
  fund_class: FundNature;
  receipt_class: ReceiptType;
  purpose: PurposeCategory;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface Programme {
  id: string;
  programme_code: string;
  name: string;
  purpose: PurposeCategory;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FundingAgreement {
  id: string;
  agreement_code: string;
  funder_organisation_id: string | null;
  status: VerificationStatus;
  conditional_disbursement_allowed: boolean;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}

export interface Disbursement {
  id: string;
  fund_pool_id: string;
  programme_id: string | null;
  funding_agreement_id: string | null;
  conditional_release: boolean;
  recipient_kind: RecipientKind;
  recipient_organisation_id: string | null;
  recipient_reference: string | null;
  amount: number;
  currency: string;
  status: DisbursementStatus;
  approval_note: string | null;
  payment_reference: string | null;
  created_at: string;
  proposed_at?: string;
  approved_at?: string | null;
  paid_at?: string | null;
  rejection_reason?: string | null;
}

export interface DisbursementDetail extends Disbursement {
  fund_pool?: FundPool;
  programme?: Programme;
  funding_agreement?: FundingAgreement;
  proposed_by?: string;
  approved_by?: string | null;
  ledger_event_hash?: string;
}

export interface PaginatedDisbursements {
  data: Disbursement[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateDisbursementPayload {
  fund_pool_id: string;
  programme_id?: string;
  funding_agreement_id?: string;
  conditional_release?: boolean;
  recipient_kind: RecipientKind;
  recipient_organisation_id?: string;
  recipient_reference?: string;
  amount: number;
  currency?: string;
}

export interface ApproveDisbursementPayload {
  approval_note?: string;
}

export interface PayDisbursementPayload {
  payment_reference: string;
}

export interface CreateFundPoolPayload {
  pool_code: string;
  name: string;
  source_origin: FundOrigin;
  fund_class: FundNature;
  receipt_class: ReceiptType;
  purpose: PurposeCategory;
  currency?: string;
}

export interface CreateProgrammePayload {
  programme_code: string;
  name: string;
  purpose: PurposeCategory;
  description?: string;
}

export interface CreateAgreementPayload {
  agreement_code: string;
  funder_organisation_id?: string;
  conditional_disbursement_allowed?: boolean;
  starts_on?: string;
  ends_on?: string;
}

export interface VerifyAgreementPayload {
  status: VerificationStatus;
  conditional_disbursement_allowed?: boolean;
}

export interface LedgerEvent {
  id: string;
  organisation_id: string;
  sequence_number: number;
  event_kind: string;
  source_table: string | null;
  source_id: string | null;
  event_payload: Record<string, unknown>;
  previous_hash: string | null;
  event_hash: string;
  signature_base64: string;
  signing_key_id: string;
  created_by: string | null;
  occurred_at: string;
  created_at: string;
}

// Summary types for the financial summary strip
export interface DisbursementSummary {
  total_disbursed: number;
  pending_approval_count: number;
  pending_approval_amount: number;
  conditional_releases_held: number;
  compliance_guardrails: string[];
}

// Filter types
export interface DisbursementFilters {
  status?: DisbursementStatus | 'ALL';
  fund_pool_source?: 'ALL' | 'DOMESTIC' | 'FOREIGN';
  search?: string;
  page?: number;
  limit?: number;
}

// Compliance check types
export interface ComplianceCheck {
  id: string;
  disbursement_id: string;
  rule_id: string | null;
  rule_code: string;
  rule_version: string;
  result: ComplianceResult;
  decision_snapshot: Record<string, unknown>;
  reviewed_by: string | null;
  checked_at: string;
  explanation: string | null;
}