import { z } from 'zod';

export const createProgrammeSchema = z.object({
  programme_code: z.string().min(1),
  name: z.string().min(1),
  purpose: z.enum(['FOOD','EDUCATION','HEALTHCARE','BIO_DIVERSITY','OPERATIONS']),
  description: z.string().optional(),
});

export const createFundPoolSchema = z.object({
  pool_code: z.string().min(1),
  name: z.string().min(1),
  source_origin: z.enum(['DOMESTIC','FOREIGN']),
  fund_class: z.enum(['CORPUS','GENERAL']),
  receipt_class: z.enum(['CSR','DONATION','MEMBERSHIP_FEE']),
  purpose: z.enum(['FOOD','EDUCATION','HEALTHCARE','BIO_DIVERSITY','OPERATIONS']),
  currency: z.string().length(3).default('INR'),
});

export const createContributionSchema = z.object({
  fund_pool_id: z.string().uuid(),
  receipt_number: z.string().min(1),
  donor_reference: z.string().optional(),
  payment_provider_reference: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  source_origin: z.enum(['DOMESTIC','FOREIGN']),
  fund_class: z.enum(['CORPUS','GENERAL']),
  receipt_class: z.enum(['CSR','DONATION','MEMBERSHIP_FEE']),
  purpose: z.enum(['FOOD','EDUCATION','HEALTHCARE','BIO_DIVERSITY','OPERATIONS']),
  received_at: z.string().datetime(),
  tax_year: z.string().optional(),
});

export const reclassifySchema = z.object({
  new_fund_pool_id: z.string().uuid(),
  reason: z.string().min(5),
});

export const createAllocationSchema = z.object({
  programme_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  note: z.string().optional(),
});

export const taxAssessmentSchema = z.object({
  claim_basis: z.enum(['NONE','CSR','80G','PENDING_REVIEW']),
  assessed_amount: z.number().nonnegative(),
  currency: z.string().length(3).default('INR'),
  legal_rule_reference: z.string().optional(),
  rule_version: z.string().min(1),
  note: z.string().optional(),
});
