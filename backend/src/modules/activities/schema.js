import { z } from 'zod';

export const createActivitySchema = z.object({
  programme_id: z.string().uuid(),
  disbursement_id: z.string().uuid().optional(),
  job_code: z.string().min(1),
  qr_payload_reference: z.string().optional(),
  activity_kind: z.enum(['MEAL_DISTRIBUTION','EDUCATION','HEALTHCARE','BIO_DIVERSITY','OTHER']),
  occurred_at: z.string().datetime(),
  quantity: z.number().positive().optional(),
  quantity_unit: z.string().optional(),
  description: z.string().min(1),
  location_generalised: z.string().optional(),
  independent_review_required: z.boolean().default(false),
});

export const addEvidenceSchema = z.object({
  evidence_kind: z.enum(['PHOTO','CHECK_IN','INVOICE','DELIVERY_NOTE','ATTENDANCE','FIELD_REPORT','OTHER']),
  storage_provider: z.string().min(1),
  object_key: z.string().min(1),
  sha256_hex: z.string().length(64),
  mime_type: z.string().min(1),
  file_size_bytes: z.number().int().positive(),
  captured_at: z.string().datetime().optional(),
  privacy_class: z.enum(['RESTRICTED','INTERNAL','PUBLIC_METADATA_ONLY']).default('RESTRICTED'),
});

export const updateEvidenceScanSchema = z.object({
  malware_scan_status: z.enum(['CLEAN','REJECTED']),
});

export const createAttestationSchema = z.object({
  level: z.enum(['SUPERVISOR_REVIEW','INDEPENDENT_SAMPLE']),
  decision: z.enum(['APPROVE','REJECT','REQUEST_CHANGES']),
  decision_reason: z.string().optional(),
  evidence_reviewed: z.array(z.string().uuid()).default([]),
});

export const createDisputeSchema = z.object({
  related_attestation_id: z.string().uuid().optional(),
  reason: z.string().min(5),
});

export const resolveDisputeSchema = z.object({
  resolution: z.string().min(5),
  status: z.enum(['RESOLVED','CLOSED']),
});
