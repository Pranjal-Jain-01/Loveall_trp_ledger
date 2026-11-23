/**
 * activities/service.js
 * Activity events, evidence files, attestations (ER-05, ER-06), and disputes.
 */
import { query, withTransaction } from '../../config/db.js';
import { assertSameOrganisation } from '../../shared/tenantGuards.js';
import { appendLedgerEvent } from '../../shared/ledgerTransaction.js';

// ─── Activities ────────────────────────────────────────────────────────────

export async function createActivity(organisationId, createdBy, data) {
  return withTransaction(async (client) => {
    await assertSameOrganisation(client, 'programmes', data.programme_id, organisationId);
    if (data.disbursement_id) {
      await assertSameOrganisation(client, 'disbursements', data.disbursement_id, organisationId);
    }

    const res = await client.query(
      `INSERT INTO activity_events
         (organisation_id, programme_id, disbursement_id, job_code, qr_payload_reference,
          activity_kind, occurred_at, quantity, quantity_unit, description,
          location_generalised, independent_review_required, impact_state, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'NOT_SUBMITTED',$13)
       RETURNING id, programme_id, job_code, activity_kind, occurred_at,
                 impact_state, independent_review_required, created_at`,
      [
        organisationId, data.programme_id, data.disbursement_id ?? null,
        data.job_code, data.qr_payload_reference ?? null,
        data.activity_kind, data.occurred_at,
        data.quantity ?? null, data.quantity_unit ?? null, data.description,
        data.location_generalised ?? null, data.independent_review_required ?? false,
        createdBy,
      ]
    );
    const activity = res.rows[0];

    // Automatically advance to PENDING_REVIEW
    await client.query(
      `UPDATE activity_events SET impact_state = 'PENDING_REVIEW' WHERE id = $1`,
      [activity.id]
    );
    activity.impact_state = 'PENDING_REVIEW';

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'ACTIVITY_SUBMITTED',
      sourceTable: 'activity_events',
      sourceId: activity.id,
      payload: {
        programme_id: data.programme_id,
        activity_kind: data.activity_kind,
        job_code: data.job_code,
        occurred_at: data.occurred_at,
        independent_review_required: data.independent_review_required ?? false,
      },
      createdBy,
    });

    return activity;
  });
}

export async function listActivities(organisationId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const res = await query(
    `SELECT id, programme_id, job_code, activity_kind, occurred_at, impact_state,
            independent_review_required, created_at
     FROM activity_events WHERE organisation_id = $1
     ORDER BY occurred_at DESC LIMIT $2 OFFSET $3`,
    [organisationId, limit, offset]
  );
  return res.rows;
}

export async function getActivity(organisationId, activityId) {
  const res = await query(
    `SELECT ae.id, ae.programme_id, ae.disbursement_id, ae.job_code,
            ae.activity_kind, ae.occurred_at, ae.quantity, ae.quantity_unit,
            ae.description, ae.location_generalised, ae.impact_state,
            ae.independent_review_required, ae.submitted_by, ae.created_at,
            p.name AS programme_name
     FROM activity_events ae
     LEFT JOIN programmes p ON p.id = ae.programme_id
     WHERE ae.id = $1 AND ae.organisation_id = $2`,
    [activityId, organisationId]
  );
  if (!res.rows.length) { const err = new Error('Activity not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Evidence Files ────────────────────────────────────────────────────────

/**
 * Add evidence file — NEVER return object_key in response or ledger payload.
 */
export async function addEvidence(organisationId, activityId, createdBy, data) {
  return withTransaction(async (client) => {
    await assertSameOrganisation(client, 'activity_events', activityId, organisationId);

    const res = await client.query(
      `INSERT INTO evidence_files
         (activity_event_id, evidence_kind, storage_provider, object_key,
          sha256_hex, mime_type, file_size_bytes, captured_at,
          privacy_class, malware_scan_status, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING',$10)
       RETURNING id, activity_event_id, evidence_kind, storage_provider,
                 sha256_hex, mime_type, file_size_bytes, captured_at,
                 privacy_class, malware_scan_status, created_at`,
      [
        activityId, data.evidence_kind, data.storage_provider,
        data.object_key,  // stored but NOT returned
        data.sha256_hex, data.mime_type, data.file_size_bytes,
        data.captured_at ?? null, data.privacy_class ?? 'RESTRICTED', createdBy,
      ]
    );
    const evidence = res.rows[0];
    // object_key already excluded from RETURNING clause

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'EVIDENCE_ADDED',
      sourceTable: 'evidence_files',
      sourceId: evidence.id,
      payload: {
        activity_event_id: activityId,
        evidence_kind: data.evidence_kind,
        sha256_hex: data.sha256_hex,
        mime_type: data.mime_type,
        file_size_bytes: data.file_size_bytes,
        privacy_class: data.privacy_class ?? 'RESTRICTED',
        // object_key intentionally excluded from ledger payload
      },
      createdBy,
    });

    return evidence;
  });
}

export async function listEvidence(organisationId, activityId) {
  await assertSameOrganisation(null, 'activity_events', activityId, organisationId);
  const res = await query(
    `SELECT id, activity_event_id, evidence_kind, storage_provider,
            sha256_hex, mime_type, file_size_bytes, captured_at,
            privacy_class, malware_scan_status, created_at
     FROM evidence_files WHERE activity_event_id = $1 ORDER BY created_at`,
    [activityId]
  );
  return res.rows;
}

export async function updateEvidenceScan(organisationId, activityId, evidenceId, { malware_scan_status }) {
  // Verify activity belongs to org
  const actCheck = await query(
    `SELECT id FROM activity_events WHERE id = $1 AND organisation_id = $2`,
    [activityId, organisationId]
  );
  if (!actCheck.rows.length) { const err = new Error('Activity not found.'); err.status = 404; throw err; }

  const res = await query(
    `UPDATE evidence_files SET malware_scan_status = $1
     WHERE id = $2 AND activity_event_id = $3
     RETURNING id, malware_scan_status`,
    [malware_scan_status, evidenceId, activityId]
  );
  if (!res.rows.length) { const err = new Error('Evidence file not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Attestations (ER-05, ER-06) ──────────────────────────────────────────

/**
 * Create attestation.
 * Service-layer checks:
 * - reviewer ≠ activity.submitted_by (ER-06 also enforced by DB trigger)
 * - at least 1 CLEAN evidence file, zero REJECTED (ER-05 enforced by DB trigger)
 * DB trigger trg_no_self_attestation and trg_activity_verified_requires_attestation also fire.
 */
export async function createAttestation(organisationId, activityId, reviewerId, data) {
  return withTransaction(async (client) => {
    await assertSameOrganisation(client, 'activity_events', activityId, organisationId);

    // Fetch activity
    const actRes = await client.query(
      `SELECT submitted_by, impact_state FROM activity_events WHERE id = $1 FOR UPDATE`,
      [activityId]
    );
    if (!actRes.rows.length) { const err = new Error('Activity not found.'); err.status = 404; throw err; }
    const activity = actRes.rows[0];

    // ER-06: service-layer check (DB trigger is defense-in-depth)
    if (activity.submitted_by === reviewerId) {
      const err = new Error('Reviewer cannot be the same user who submitted the activity (ER-06).');
      err.status = 422; throw err;
    }

    // ER-05: verify evidence gate
    const scanRes = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE malware_scan_status = 'CLEAN') AS clean_count,
         COUNT(*) FILTER (WHERE malware_scan_status = 'REJECTED') AS rejected_count
       FROM evidence_files WHERE activity_event_id = $1`,
      [activityId]
    );
    const { clean_count, rejected_count } = scanRes.rows[0];
    if (parseInt(clean_count) === 0) {
      const err = new Error('Activity must have at least one CLEAN evidence file before attestation (ER-05).');
      err.status = 422; throw err;
    }
    if (parseInt(rejected_count) > 0) {
      const err = new Error('Activity has REJECTED evidence files; resolve before attesting (ER-05).');
      err.status = 422; throw err;
    }

    // Insert attestation — trg_no_self_attestation fires here as backup
    const attRes = await client.query(
      `INSERT INTO attestations
         (activity_event_id, reviewer_id, level, decision, decision_reason)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, activity_event_id, reviewer_id, level, decision, decision_reason, created_at`,
      [activityId, reviewerId, data.level, data.decision, data.decision_reason ?? null]
    );
    const attestation = attRes.rows[0];

    // Determine new impact_state based on decision
    let newImpactState = activity.impact_state;
    if (data.decision === 'APPROVE') {
      newImpactState = 'VERIFIED';
    } else if (data.decision === 'REJECT') {
      newImpactState = 'REJECTED';
    } else if (data.decision === 'REQUEST_CHANGES') {
      newImpactState = 'CHANGES_REQUESTED';
    }

    if (newImpactState !== activity.impact_state) {
      await client.query(
        `UPDATE activity_events SET impact_state = $1 WHERE id = $2`,
        [newImpactState, activityId]
      );
    }

    await appendLedgerEvent(client, {
      organisationId,
      eventKind: 'ATTESTATION_RECORDED',
      sourceTable: 'attestations',
      sourceId: attestation.id,
      payload: {
        activity_event_id: activityId,
        level: data.level,
        decision: data.decision,
        new_impact_state: newImpactState,
      },
      createdBy: reviewerId,
    });

    if (newImpactState !== activity.impact_state) {
      await appendLedgerEvent(client, {
        organisationId,
        eventKind: 'ACTIVITY_STATUS_CHANGED',
        sourceTable: 'activity_events',
        sourceId: activityId,
        payload: {
          from: activity.impact_state,
          to: newImpactState,
          triggered_by_attestation_id: attestation.id,
        },
        createdBy: reviewerId,
      });
    }

    return { attestation, impact_state: newImpactState };
  });
}

export async function listAttestations(organisationId, activityId) {
  await assertSameOrganisation(null, 'activity_events', activityId, organisationId);
  const res = await query(
    `SELECT id, reviewer_id, level, decision, decision_reason, created_at
     FROM attestations WHERE activity_event_id = $1 ORDER BY created_at`,
    [activityId]
  );
  return res.rows;
}

// ─── Disputes ──────────────────────────────────────────────────────────────

export async function createDispute(organisationId, activityId, createdBy, data) {
  await assertSameOrganisation(null, 'activity_events', activityId, organisationId);

  const res = await query(
    `INSERT INTO activity_disputes
       (activity_event_id, related_attestation_id, raised_by, reason, status)
     VALUES ($1,$2,$3,$4,'OPEN')
     RETURNING id, activity_event_id, related_attestation_id, raised_by, reason, status, created_at`,
    [activityId, data.related_attestation_id ?? null, createdBy, data.reason]
  );
  return res.rows[0];
}

export async function resolveDispute(organisationId, activityId, disputeId, data) {
  await assertSameOrganisation(null, 'activity_events', activityId, organisationId);

  const res = await query(
    `UPDATE activity_disputes SET resolution = $1, status = $2, resolved_at = now()
     WHERE id = $3 AND activity_event_id = $4
     RETURNING id, status, resolution, resolved_at`,
    [data.resolution, data.status, disputeId, activityId]
  );
  if (!res.rows.length) { const err = new Error('Dispute not found.'); err.status = 404; throw err; }
  return res.rows[0];
}
