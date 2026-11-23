import { z } from 'zod';

export const createAccountSchema = z.object({
  account_code: z.string().min(1),
  account_name: z.string().min(1),
  account_type: z.enum(['ASSET','LIABILITY','FUND_BALANCE','INCOME','EXPENSE']),
});

const journalLineSchema = z.object({
  account_id: z.string().uuid(),
  debit: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  line_description: z.string().optional(),
}).refine((l) => (l.debit > 0 && l.credit === 0) || (l.credit > 0 && l.debit === 0), {
  message: 'Each line must have exactly one of debit or credit > 0',
});

export const createJournalEntrySchema = z.object({
  entry_number: z.string().min(1),
  effective_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currency: z.string().length(3).default('INR'),
  description: z.string().min(1),
  lines: z.array(journalLineSchema).min(2, 'At least 2 journal lines required'),
});
