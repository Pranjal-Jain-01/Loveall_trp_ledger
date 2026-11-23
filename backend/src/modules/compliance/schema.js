import { z } from 'zod';

export const createAgreementSchema = z.object({
  agreement_code: z.string().min(1),
  funder_organisation_id: z.string().uuid().optional(),
  conditional_disbursement_allowed: z.boolean().default(false),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
});

export const verifyAgreementSchema = z.object({
  status: z.enum(['VERIFIED','REJECTED']),
  conditional_disbursement_allowed: z.boolean().optional(),
});

export const createComplianceRuleSchema = z.object({
  rule_code: z.string().min(1),
  rule_version: z.string().min(1),
  jurisdiction: z.string().default('IN'),
  legal_reference: z.string().optional(),
  description: z.string().min(1),
  configuration: z.record(z.unknown()).default({}),
  effective_from: z.string().optional(),
  effective_until: z.string().optional(),
});

export const createDisbursementSchema = z.object({
  fund_pool_id: z.string().uuid(),
  programme_id: z.string().uuid().optional(),
  funding_agreement_id: z.string().uuid().optional(),
  conditional_release: z.boolean().default(false),
  recipient_kind: z.enum(['PARTNER_NGO','VENDOR','EMPLOYEE','BENEFICIARY','OTHER']),
  recipient_organisation_id: z.string().uuid().optional(),
  recipient_reference: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
});

export const approveDisbursementSchema = z.object({
  approval_note: z.string().optional(),
});

export const payDisbursementSchema = z.object({
  payment_reference: z.string().min(1),
});
