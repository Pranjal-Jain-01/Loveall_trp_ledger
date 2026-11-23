/**
 * accounting/service.js
 * Chart of accounts and double-entry journal entries.
 * ER-08: journal balance enforced by DB triggers (trg_journal_lines_balanced / trg_journal_header_balanced).
 */
import { query, withTransaction } from '../../config/db.js';
import { assertSameOrganisation } from '../../shared/tenantGuards.js';
import { appendLedgerEvent } from '../../shared/ledgerTransaction.js';

// ─── Chart of Accounts ─────────────────────────────────────────────────────

export async function createAccount(organisationId, data) {
  const res = await query(
    `INSERT INTO chart_of_accounts (organisation_id, account_code, account_name, account_type)
     VALUES ($1, $2, $3, $4)
     RETURNING id, organisation_id, account_code, account_name, account_type, is_active, created_at`,
    [organisationId, data.account_code, data.account_name, data.account_type]
  );
  return res.rows[0];
}

export async function listAccounts(organisationId) {
  const res = await query(
    `SELECT id, account_code, account_name, account_type, is_active, created_at
     FROM chart_of_accounts WHERE organisation_id = $1 ORDER BY account_code`,
    [organisationId]
  );
  return res.rows;
}

export async function getAccount(organisationId, accountId) {
  const res = await query(
    `SELECT id, account_code, account_name, account_type, is_active, created_at
     FROM chart_of_accounts WHERE id = $1 AND organisation_id = $2`,
    [accountId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Account not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Journal Entries ───────────────────────────────────────────────────────

/**
 * Create a DRAFT journal entry with lines.
 * DB trigger validates balance when status transitions to POSTED.
 */
export async function createJournalEntry(organisationId, createdBy, { entry_number, effective_on, currency, description, lines }) {
  return withTransaction(async (client) => {
    // Verify all accounts belong to this org
    for (const line of lines) {
      await assertSameOrganisation(client, 'chart_of_accounts', line.account_id, organisationId);
    }

    const entryRes = await client.query(
      `INSERT INTO journal_entries (organisation_id, entry_number, effective_on, currency, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6)
       RETURNING id, entry_number, effective_on, currency, description, status, created_at`,
      [organisationId, entry_number, effective_on, currency ?? 'INR', description, createdBy]
    );
    const entry = entryRes.rows[0];

    for (const line of lines) {
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, line_description)
         VALUES ($1, $2, $3, $4, $5)`,
        [entry.id, line.account_id, line.debit ?? 0, line.credit ?? 0, line.line_description ?? null]
      );
    }

    return entry;
  });
}

export async function listJournalEntries(organisationId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const res = await query(
    `SELECT id, entry_number, effective_on, currency, description, status, created_at
     FROM journal_entries WHERE organisation_id = $1
     ORDER BY effective_on DESC, created_at DESC LIMIT $2 OFFSET $3`,
    [organisationId, limit, offset]
  );
  return res.rows;
}

export async function getJournalEntry(organisationId, entryId) {
  const entryRes = await query(
    `SELECT id, entry_number, effective_on, currency, description, status, ledger_event_id, created_at
     FROM journal_entries WHERE id = $1 AND organisation_id = $2`,
    [entryId, organisationId]
  );
  if (!entryRes.rows.length) { const err = new Error('Journal entry not found.'); err.status = 404; throw err; }
  const entry = entryRes.rows[0];

  const linesRes = await query(
    `SELECT jl.id, jl.account_id, jl.debit, jl.credit, jl.line_description,
            coa.account_code, coa.account_name, coa.account_type
     FROM journal_lines jl
     JOIN chart_of_accounts coa ON coa.id = jl.account_id
     WHERE jl.journal_entry_id = $1
     ORDER BY jl.id`,
    [entryId]
  );
  return { ...entry, lines: linesRes.rows };
}

/**
 * ER-08: Post a journal entry.
 * 1. Append ledger event FIRST (to get ledger_event_id)
 * 2. UPDATE journal_entries.status to POSTED with that ledger_event_id
 * DB trigger trg_journal_header_balanced fires on POSTED status update.
 */
export async function postJournalEntry(organisationId, entryId, createdBy) {
  return withTransaction(async (client) => {
    const entryRes = await client.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND organisation_id = $2 FOR UPDATE`,
      [entryId, organisationId]
    );
    if (!entryRes.rows.length) { const err = new Error('Journal entry not found.'); err.status = 404; throw err; }
    const entry = entryRes.rows[0];
    if (entry.status !== 'DRAFT') {
      const err = new Error(`Cannot post a journal entry with status '${entry.status}'.`); err.status = 409; throw err;
    }

    // Append ledger event FIRST
    const ledgerEvent = await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'JOURNAL_POSTED',
      sourceTable: 'journal_entries',
      sourceId: entryId,
      payload: {
        entry_number: entry.entry_number,
        effective_on: entry.effective_on,
        currency: entry.currency,
        description: entry.description,
      },
      createdBy,
    });

    // Update journal_entries to POSTED with ledger_event_id
    // This triggers trg_journal_header_balanced which validates balance
    const updRes = await client.query(
      `UPDATE journal_entries SET status = 'POSTED', ledger_event_id = $1
       WHERE id = $2
       RETURNING id, entry_number, status, ledger_event_id`,
      [ledgerEvent.id, entryId]
    );

    return updRes.rows[0];
  });
}

/**
 * Reverse a POSTED journal entry.
 */
export async function reverseJournalEntry(organisationId, entryId, createdBy) {
  return withTransaction(async (client) => {
    const entryRes = await client.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND organisation_id = $2 FOR UPDATE`,
      [entryId, organisationId]
    );
    if (!entryRes.rows.length) { const err = new Error('Journal entry not found.'); err.status = 404; throw err; }
    const entry = entryRes.rows[0];
    if (entry.status !== 'POSTED') {
      const err = new Error('Only POSTED entries can be reversed.'); err.status = 409; throw err;
    }

    await client.query(
      `UPDATE journal_entries SET status = 'REVERSED' WHERE id = $1`,
      [entryId]
    );

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'JOURNAL_REVERSED',
      sourceTable: 'journal_entries',
      sourceId: entryId,
      payload: { entry_number: entry.entry_number, reversed_by: createdBy },
      createdBy,
    });

    return { id: entryId, status: 'REVERSED' };
  });
}
