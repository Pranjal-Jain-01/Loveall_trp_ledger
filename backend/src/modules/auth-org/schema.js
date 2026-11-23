import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(2),
  organisation_name: z.string().min(2),
  organisation_type: z.enum(['FOUNDATION','NGO','MERCHANT','AUDITOR','OTHER']),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createOrgSchema = z.object({
  name: z.string().min(2),
  organisation_type: z.enum(['FOUNDATION','NGO','MERCHANT','AUDITOR','OTHER']),
});

export const createMembershipSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['ORG_ADMIN','FINANCE_OFFICER','FIELD_WORKER','SUPERVISOR','INDEPENDENT_VERIFIER','AUDITOR']),
});

export const createRegistrationSchema = z.object({
  registration_kind: z.enum(['12AB','80G','CSR1','FCRA','OTHER']),
  registration_number: z.string().min(1),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
});

export const verifyRegistrationSchema = z.object({
  status: z.enum(['VERIFIED','REJECTED']),
  reviewer_note: z.string().optional(),
});
