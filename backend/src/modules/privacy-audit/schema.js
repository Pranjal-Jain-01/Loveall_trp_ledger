/**
 * privacy-audit/schema.js
 */
import { z } from 'zod';

export const createDsrSchema = z.object({
  request_kind: z.enum(['ACCESS', 'CORRECTION', 'ERASURE', 'LEGAL_RETENTION_REVIEW']),
  subject_reference: z.string().min(1),
  description: z.string().optional(),
  legal_basis: z.string().optional(),
});

export const updateDsrSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'WITHDRAWN']),
  resolution_note: z.string().optional(),
});
