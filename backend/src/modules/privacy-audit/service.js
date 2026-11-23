/**
 * privacy-audit/service.js
 * Data Subject Requests (DSR) + access_audit_log reading.
 */
import { query, withTransaction } from '../../config/db.js';
import { appendLedgerEvent } from '../../shared/ledgerTransaction.js';


// ─── Data Subject Requests ─────────────────────────────────────────────────

/**
 * Create a DSR and emit PRIVACY_REQUEST_RECORDED ledger event.
 * Any authenticated member can file a DSR for their own organisation.
 */
export async function createDsr(organisationId, createdBy, data) {
  return withTransaction(async (client) => {
    const res = await client.query(
      `INSERT INTO data_subject_requests
         (organisation_id, request_kind, subject_reference, description, legal_basis, status, requested_by)
       VALUES ($1,$2,$3,$4,$5,'PENDING',$6)
       RETURNING id, request_kind, subject_reference, status, created_at`,
      [
        organisationId, data.request_kind, data.subject_reference,
        data.description ?? null, data.legal_basis ?? null, createdBy,
      ]
    );
    const dsr = res.rows[0];

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'PRIVACY_REQUEST_RECORDED',
      sourceTable: 'data_subject_requests',
      sourceId: dsr.id,
      payload: {
        request_kind: data.request_kind,
        // subject_reference intentionally not included — treat as PII
        status: 'PENDING',
      },
      createdBy,
    });

    return dsr;
  });
}

export async function listDsrs(organisationId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const res = await query(
    `SELECT id, request_kind, subject_reference, status, description, legal_basis,
            requested_by, created_at, updated_at
     FROM data_subject_requests WHERE organisation_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [organisationId, limit, offset]
  );
  return res.rows;
}

export async function getDsr(organisationId, dsrId) {
  const res = await query(
    `SELECT id, request_kind, subject_reference, description, legal_basis,
            status, resolution_note, requested_by, created_at, updated_at
     FROM data_subject_requests WHERE id = $1 AND organisation_id = $2`,
    [dsrId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('DSR not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

export async function updateDsr(organisationId, dsrId, { status, resolution_note }) {
  const res = await query(
    `UPDATE data_subject_requests
     SET status = $1, resolution_note = $2, updated_at = now()
     WHERE id = $3 AND organisation_id = $4
     RETURNING id, request_kind, status, resolution_note, updated_at`,
    [status, resolution_note ?? null, dsrId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('DSR not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Access Audit Log ──────────────────────────────────────────────────────

export async function listAuditLogs(organisationId, { page = 1, limit = 50, actor_user_id, resource_type, outcome } = {}) {
  const offset = (page - 1) * limit;
  const conditions = ['organisation_id = $1'];
  const params = [organisationId];
  let idx = 2;

  if (actor_user_id) { conditions.push(`actor_user_id = $${idx++}`); params.push(actor_user_id); }
  if (resource_type) { conditions.push(`resource_type = $${idx++}`); params.push(resource_type); }
  if (outcome) { conditions.push(`outcome = $${idx++}`); params.push(outcome); }

  params.push(limit, offset);
  const res = await query(
    `SELECT id, actor_user_id, action, resource_type, resource_id, outcome,
            request_id, ip_address, metadata, created_at
     FROM access_audit_log
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    params
  );
  return res.rows;
}
