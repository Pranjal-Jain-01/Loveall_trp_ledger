import { z } from 'zod';

export const createSigningKeySchema = z.object({
  key_name: z.string().min(1),
  key_version: z.number().int().positive(),
  public_key_pem: z.string().min(50),
  private_key_location_reference: z.string().min(1),
  activated_at: z.string().datetime().optional(),
});

export const createBatchSchema = z.object({
  first_sequence: z.number().int().positive(),
  last_sequence: z.number().int().positive(),
  anchor_kind: z.enum(['NONE','PUBLISHED_HASH','BLOCKCHAIN']).default('PUBLISHED_HASH'),
  published_url: z.string().url().optional(),
});
