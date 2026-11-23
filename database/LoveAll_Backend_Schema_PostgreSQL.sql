-- LoveAll Transparency Ledger - PostgreSQL starter schema
-- Target: PostgreSQL 16+
-- Date: 2026-11-01
-- Scope: 90-day prototype using simulated data.
-- IMPORTANT: Review with the Foundation's CA/legal adviser and security reviewer.
-- No private signing keys or raw personal data should be stored in this schema.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
CREATE TYPE organisation_type AS ENUM ('FOUNDATION','NGO','MERCHANT','AUDITOR','OTHER');
CREATE TYPE organisation_status AS ENUM ('ACTIVE','INACTIVE','SUSPENDED');
CREATE TYPE user_role AS ENUM ('ORG_ADMIN','FINANCE_OFFICER','FIELD_WORKER','SUPERVISOR','INDEPENDENT_VERIFIER','AUDITOR');
CREATE TYPE registration_type AS ENUM ('12AB','80G','CSR1','FCRA','OTHER');
CREATE TYPE verification_status AS ENUM ('PENDING','VERIFIED','REJECTED','EXPIRED');
CREATE TYPE fund_origin AS ENUM ('DOMESTIC','FOREIGN');
CREATE TYPE fund_nature AS ENUM ('CORPUS','GENERAL');
CREATE TYPE receipt_type AS ENUM ('CSR','DONATION','MEMBERSHIP_FEE');
CREATE TYPE purpose_category AS ENUM ('FOOD','EDUCATION','HEALTHCARE','BIO_DIVERSITY','OPERATIONS');
CREATE TYPE contribution_status AS ENUM ('RECEIVED','ALLOCATED','PARTIALLY_DISBURSED','DISBURSED','REVERSED');
CREATE TYPE tax_claim_basis AS ENUM ('NONE','CSR','80G','PENDING_REVIEW');
CREATE TYPE recipient_type AS ENUM ('PARTNER_NGO','VENDOR','EMPLOYEE','BENEFICIARY','OTHER');
CREATE TYPE disbursement_status AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','PAID','REJECTED','CANCELLED');
CREATE TYPE compliance_result AS ENUM ('PASS','FAIL','REVIEW_REQUIRED','NOT_APPLICABLE');
CREATE TYPE activity_type AS ENUM ('MEAL_DISTRIBUTION','EDUCATION','HEALTHCARE','BIO_DIVERSITY','OTHER');
CREATE TYPE impact_status AS ENUM ('NOT_SUBMITTED','PENDING_REVIEW','VERIFIED','REJECTED','CHANGES_REQUESTED');
CREATE TYPE evidence_type AS ENUM ('PHOTO','CHECK_IN','INVOICE','DELIVERY_NOTE','ATTENDANCE','FIELD_REPORT','OTHER');
CREATE TYPE attestation_level AS ENUM ('FIELD_SUBMISSION','SUPERVISOR_REVIEW','INDEPENDENT_SAMPLE');
CREATE TYPE attestation_decision AS ENUM ('APPROVE','REJECT','REQUEST_CHANGES');
CREATE TYPE dispute_status AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED');
CREATE TYPE ledger_event_type AS ENUM ('CONTRIBUTION_RECEIVED','CLASSIFICATION_CORRECTED','ALLOCATION_CREATED','DISBURSEMENT_PROPOSED','DISBURSEMENT_APPROVED','DISBURSEMENT_PAID','DISBURSEMENT_REJECTED','ACTIVITY_SUBMITTED','EVIDENCE_ADDED','ATTESTATION_RECORDED','ACTIVITY_STATUS_CHANGED','PRIVACY_REQUEST_RECORDED','OTHER');
CREATE TYPE anchor_type AS ENUM ('NONE','PUBLISHED_HASH','BLOCKCHAIN');
CREATE TYPE privacy_request_type AS ENUM ('ACCESS','CORRECTION','ERASURE');
CREATE TYPE privacy_request_status AS ENUM ('RECEIVED','UNDER_REVIEW','APPROVED','REJECTED','COMPLETED');
CREATE TYPE journal_entry_status AS ENUM ('DRAFT','POSTED','REVERSED');

-- ---------------------------------------------------------------------------
-- ORGANISATIONS, USERS, MEMBERSHIPS, REGISTRATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    organisation_type organisation_type NOT NULL,
    status organisation_status NOT NULL DEFAULT 'ACTIVE',
    is_platform_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE organisation_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role user_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, user_id, role)
);
CREATE INDEX idx_memberships_user ON organisation_memberships(user_id);

CREATE TABLE organisation_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    registration_kind registration_type NOT NULL,
    registration_number TEXT NOT NULL,
    valid_from DATE,
    valid_until DATE,
    status verification_status NOT NULL DEFAULT 'PENDING',
    evidence_object_key TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    reviewer_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, registration_kind, registration_number)
);

-- ---------------------------------------------------------------------------
-- PROGRAMMES AND FUND POOLS
-- ---------------------------------------------------------------------------
CREATE TABLE programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    programme_code TEXT NOT NULL,
    name TEXT NOT NULL,
    purpose purpose_category NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, programme_code)
);

-- Conditional release must be permitted by a recorded funding agreement.
CREATE TABLE funding_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agreement_code TEXT NOT NULL UNIQUE,
    funder_organisation_id UUID REFERENCES organisations(id),
    implementing_organisation_id UUID NOT NULL REFERENCES organisations(id),
    conditional_disbursement_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    agreement_object_key TEXT,
    starts_on DATE,
    ends_on DATE,
    status verification_status NOT NULL DEFAULT 'PENDING',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE fund_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    pool_code TEXT NOT NULL,
    name TEXT NOT NULL,
    source_origin fund_origin NOT NULL,
    fund_class fund_nature NOT NULL,
    receipt_class receipt_type NOT NULL,
    purpose purpose_category NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, pool_code)
);
CREATE INDEX idx_fund_pools_classification ON fund_pools(organisation_id, source_origin, fund_class, receipt_class, purpose);

-- ---------------------------------------------------------------------------
-- CONTRIBUTIONS AND TAX TREATMENT
-- One contribution = one actual payment and one receipt_type. Do not split a
-- single payment into donation + membership-fee categories.
-- ---------------------------------------------------------------------------
CREATE TABLE contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    fund_pool_id UUID REFERENCES fund_pools(id),
    receipt_number TEXT NOT NULL,
    donor_reference TEXT, -- pseudonymous/external reference only; no donor PII
    payment_provider_reference TEXT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    source_origin fund_origin NOT NULL,
    fund_class fund_nature NOT NULL,
    receipt_class receipt_type NOT NULL,
    purpose purpose_category NOT NULL,
    status contribution_status NOT NULL DEFAULT 'RECEIVED',
    received_at TIMESTAMPTZ NOT NULL,
    tax_year TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, receipt_number),
    UNIQUE (organisation_id, payment_provider_reference)
);
CREATE INDEX idx_contributions_org_received ON contributions(organisation_id, received_at DESC);
CREATE INDEX idx_contributions_pool ON contributions(fund_pool_id);

CREATE TABLE tax_treatment_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id UUID NOT NULL UNIQUE REFERENCES contributions(id),
    claim_basis tax_claim_basis NOT NULL DEFAULT 'PENDING_REVIEW',
    assessed_amount NUMERIC(14,2) NOT NULL CHECK (assessed_amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    legal_rule_reference TEXT,
    rule_version TEXT NOT NULL,
    approved_by UUID REFERENCES users(id),
    assessed_at TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION check_tax_assessment_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_contribution_amount NUMERIC(14,2);
BEGIN
    SELECT amount INTO v_contribution_amount FROM contributions WHERE id = NEW.contribution_id;
    IF NEW.assessed_amount > v_contribution_amount THEN
        RAISE EXCEPTION 'Assessed amount cannot exceed the contribution amount';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tax_assessment_amount
BEFORE INSERT OR UPDATE ON tax_treatment_assessments
FOR EACH ROW EXECUTE FUNCTION check_tax_assessment_amount();
-- A single assessment row and single claim_basis prevents the same contribution
-- from being simultaneously tagged CSR and 80G. Partial treatments require CA
-- review and a more granular legally-approved allocation model before adding.

CREATE TABLE contribution_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id UUID NOT NULL REFERENCES contributions(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    allocated_by UUID REFERENCES users(id),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT
);
CREATE INDEX idx_contribution_allocations_contribution ON contribution_allocations(contribution_id);

-- ---------------------------------------------------------------------------
-- DOUBLE-ENTRY JOURNAL
-- ---------------------------------------------------------------------------
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('ASSET','LIABILITY','FUND_BALANCE','INCOME','EXPENSE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (organisation_id, account_code)
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    ledger_event_id UUID, -- FK added after ledger_events is created
    entry_number TEXT NOT NULL,
    effective_on DATE NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    description TEXT NOT NULL,
    status journal_entry_status NOT NULL DEFAULT 'DRAFT',
    posted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, entry_number)
);

CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    debit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    line_description TEXT,
    CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
-- Application/service must validate total debits = total credits before status=POSTED.
-- Implement a deferred database trigger for balanced posting before production.

-- ---------------------------------------------------------------------------
-- COMPLIANCE CHECKS AND DISBURSEMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    fund_pool_id UUID NOT NULL REFERENCES fund_pools(id),
    programme_id UUID REFERENCES programmes(id),
    funding_agreement_id UUID REFERENCES funding_agreements(id),
    conditional_release BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_kind recipient_type NOT NULL,
    recipient_organisation_id UUID REFERENCES organisations(id),
    recipient_reference TEXT, -- vendor/beneficiary pseudonymous reference; no public PII
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    status disbursement_status NOT NULL DEFAULT 'DRAFT',
    payment_reference TEXT,
    proposed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    rejection_reason TEXT,
    CHECK ((recipient_kind = 'PARTNER_NGO' AND recipient_organisation_id IS NOT NULL)
        OR (recipient_kind <> 'PARTNER_NGO'))
);
CREATE INDEX idx_disbursements_pool ON disbursements(fund_pool_id);
CREATE INDEX idx_disbursements_status ON disbursements(organisation_id, status);

CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code TEXT NOT NULL,
    rule_version TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'IN',
    legal_reference TEXT,
    description TEXT NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from DATE,
    effective_until DATE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (rule_code, rule_version),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until >= effective_from)
);

CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disbursement_id UUID NOT NULL REFERENCES disbursements(id),
    rule_id UUID REFERENCES compliance_rules(id),
    rule_code TEXT NOT NULL,
    rule_version TEXT NOT NULL,
    result compliance_result NOT NULL,
    decision_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewed_by UUID REFERENCES users(id),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    explanation TEXT
);
CREATE INDEX idx_compliance_checks_disbursement ON compliance_checks(disbursement_id, checked_at DESC);

-- Enforce the sponsor's minimum control at the database boundary.
-- Legal counsel must confirm any other foreign-fund payee categories and their treatment.
CREATE OR REPLACE FUNCTION block_foreign_pool_to_partner_ngo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_origin fund_origin;
BEGIN
    SELECT source_origin INTO v_origin FROM fund_pools WHERE id = NEW.fund_pool_id;
    IF v_origin = 'FOREIGN' AND NEW.recipient_kind = 'PARTNER_NGO' THEN
        RAISE EXCEPTION 'Prohibited routing: foreign-tagged fund pools cannot be transferred to a partner NGO';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_block_foreign_partner_transfer
BEFORE INSERT OR UPDATE ON disbursements
FOR EACH ROW EXECUTE FUNCTION block_foreign_pool_to_partner_ngo();

CREATE OR REPLACE FUNCTION enforce_conditional_release_agreement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_allowed BOOLEAN; v_status verification_status;
BEGIN
    IF NEW.conditional_release THEN
        IF NEW.funding_agreement_id IS NULL THEN
            RAISE EXCEPTION 'Conditional release requires a linked funding agreement';
        END IF;
        SELECT conditional_disbursement_allowed, status
          INTO v_allowed, v_status
          FROM funding_agreements WHERE id = NEW.funding_agreement_id;
        IF NOT FOUND OR NOT v_allowed OR v_status <> 'VERIFIED' THEN
            RAISE EXCEPTION 'The linked funding agreement does not permit verified conditional release';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_conditional_release_agreement
BEFORE INSERT OR UPDATE ON disbursements
FOR EACH ROW EXECUTE FUNCTION enforce_conditional_release_agreement();

-- ---------------------------------------------------------------------------
-- ACTIVITY EVENTS, EVIDENCE AND ATTESTATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    programme_id UUID NOT NULL REFERENCES programmes(id),
    disbursement_id UUID REFERENCES disbursements(id),
    job_code TEXT NOT NULL,
    qr_payload_reference TEXT,
    activity_kind activity_type NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    quantity NUMERIC(14,3),
    quantity_unit TEXT,
    description TEXT NOT NULL,
    location_generalised TEXT, -- avoid precise beneficiary-sensitive coordinates by default
    submitted_by UUID NOT NULL REFERENCES users(id),
    impact_state impact_status NOT NULL DEFAULT 'NOT_SUBMITTED',
    independent_review_required BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, job_code)
);
CREATE INDEX idx_activity_programme_date ON activity_events(programme_id, occurred_at DESC);
CREATE INDEX idx_activity_impact_state ON activity_events(organisation_id, impact_state);

CREATE TABLE evidence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activity_events(id),
    evidence_kind evidence_type NOT NULL,
    storage_provider TEXT NOT NULL,
    object_key TEXT NOT NULL,
    sha256_hex CHAR(64) NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    captured_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    privacy_class TEXT NOT NULL DEFAULT 'RESTRICTED' CHECK (privacy_class IN ('RESTRICTED','INTERNAL','PUBLIC_METADATA_ONLY')),
    malware_scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (malware_scan_status IN ('PENDING','CLEAN','REJECTED')),
    UNIQUE (storage_provider, object_key)
);
CREATE INDEX idx_evidence_activity ON evidence_files(activity_id);

CREATE TABLE attestations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activity_events(id),
    level attestation_level NOT NULL,
    decision attestation_decision NOT NULL,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    decision_reason TEXT,
    evidence_reviewed JSONB NOT NULL DEFAULT '[]'::jsonb,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attestations_activity ON attestations(activity_id, decided_at DESC);

CREATE TABLE activity_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activity_events(id),
    related_attestation_id UUID REFERENCES attestations(id),
    opened_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status dispute_status NOT NULL DEFAULT 'OPEN',
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_activity_disputes_activity ON activity_disputes(activity_id, opened_at DESC);

-- ---------------------------------------------------------------------------
-- SIGNED APPEND-ONLY LEDGER AND OPTIONAL BATCH ANCHOR
-- ---------------------------------------------------------------------------
CREATE TABLE signing_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    key_name TEXT NOT NULL,
    algorithm TEXT NOT NULL CHECK (algorithm IN ('Ed25519')),
    key_version INTEGER NOT NULL,
    public_key_pem TEXT NOT NULL,
    private_key_location_reference TEXT NOT NULL, -- KMS/HSM/secret manager reference only
    status TEXT NOT NULL CHECK (status IN ('ACTIVE','ROTATED','REVOKED')),
    activated_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    UNIQUE (organisation_id, key_name, key_version)
);

CREATE TABLE ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    sequence_number BIGINT NOT NULL CHECK (sequence_number > 0),
    event_kind ledger_event_type NOT NULL,
    source_table TEXT,
    source_id UUID,
    event_payload JSONB NOT NULL,
    previous_hash CHAR(64),
    event_hash CHAR(64) NOT NULL,
    signature_base64 TEXT NOT NULL,
    signing_key_id UUID NOT NULL REFERENCES signing_keys(id),
    created_by UUID REFERENCES users(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, sequence_number),
    UNIQUE (organisation_id, event_hash)
);
CREATE INDEX idx_ledger_events_source ON ledger_events(source_table, source_id);
CREATE INDEX idx_ledger_events_created ON ledger_events(organisation_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_ledger_event_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'ledger_events are append-only; create a correction event instead';
END;
$$;
CREATE TRIGGER trg_ledger_events_no_update
BEFORE UPDATE OR DELETE ON ledger_events
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_event_mutation();

CREATE TABLE ledger_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    first_sequence BIGINT NOT NULL,
    last_sequence BIGINT NOT NULL,
    root_hash CHAR(64) NOT NULL,
    anchor_kind anchor_type NOT NULL DEFAULT 'PUBLISHED_HASH',
    published_url TEXT,
    chain_id TEXT,
    transaction_hash TEXT,
    anchored_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (last_sequence >= first_sequence),
    UNIQUE (organisation_id, first_sequence, last_sequence)
);

ALTER TABLE journal_entries
    ADD CONSTRAINT fk_journal_ledger_event
    FOREIGN KEY (ledger_event_id) REFERENCES ledger_events(id);

-- ---------------------------------------------------------------------------
-- PUBLIC RECEIPT VERIFICATION
-- Store only a hash of the random public token, never the raw token.
-- ---------------------------------------------------------------------------
CREATE TABLE public_receipt_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contribution_id UUID NOT NULL REFERENCES contributions(id),
    token_hash CHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (contribution_id)
);

-- Do not expose a broad public SQL view. The public receipt endpoint must first
-- verify a high-entropy token against public_receipt_tokens.token_hash, then
-- construct an allowlisted response in the API layer. Do not grant anonymous
-- database access to contributions, activity_events, evidence_files or ledger_events.

-- ---------------------------------------------------------------------------
-- DATA PRINCIPAL REQUESTS AND ACCESS AUDIT
-- ---------------------------------------------------------------------------
CREATE TABLE data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    requester_reference TEXT NOT NULL, -- pseudonymous reference; identity check occurs securely elsewhere
    request_kind privacy_request_type NOT NULL,
    status privacy_request_status NOT NULL DEFAULT 'RECEIVED',
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_to UUID REFERENCES users(id),
    decision_reason TEXT,
    completed_at TIMESTAMPTZ,
    legal_retention_review BOOLEAN NOT NULL DEFAULT FALSE,
    request_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE access_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id),
    actor_user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS','DENIED','ERROR')),
    request_id TEXT,
    ip_address INET,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_access_audit_org_time ON access_audit_log(organisation_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- BASIC CONSISTENCY TRIGGERS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_contribution_matches_pool()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p fund_pools%ROWTYPE;
BEGIN
    IF NEW.fund_pool_id IS NOT NULL THEN
        SELECT * INTO p FROM fund_pools WHERE id = NEW.fund_pool_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Fund pool does not exist';
        END IF;
        IF NEW.organisation_id <> p.organisation_id
           OR NEW.source_origin <> p.source_origin
           OR NEW.fund_class <> p.fund_class
           OR NEW.receipt_class <> p.receipt_class
           OR NEW.purpose <> p.purpose THEN
            RAISE EXCEPTION 'Contribution classification must match its fund pool';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_contribution_pool_match
BEFORE INSERT OR UPDATE OF fund_pool_id, organisation_id, source_origin, fund_class, receipt_class, purpose
ON contributions
FOR EACH ROW EXECUTE FUNCTION ensure_contribution_matches_pool();

CREATE OR REPLACE FUNCTION prevent_contribution_reclassification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.source_origin <> OLD.source_origin
       OR NEW.fund_class <> OLD.fund_class
       OR NEW.receipt_class <> OLD.receipt_class
       OR NEW.purpose <> OLD.purpose THEN
        RAISE EXCEPTION 'Original contribution classification cannot be overwritten; create an authorised correction event';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_contribution_classification_immutable
BEFORE UPDATE ON contributions
FOR EACH ROW EXECUTE FUNCTION prevent_contribution_reclassification();

-- Enforce contribution allocation total <= contribution amount.
CREATE OR REPLACE FUNCTION check_contribution_allocation_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_contribution_id UUID; v_amount NUMERIC(14,2); v_total NUMERIC(14,2);
BEGIN
    IF TG_OP = 'INSERT' THEN v_contribution_id := NEW.contribution_id; ELSE v_contribution_id := OLD.contribution_id; END IF;
    SELECT amount INTO v_amount FROM contributions WHERE id = v_contribution_id FOR UPDATE;
    SELECT COALESCE(SUM(amount),0) INTO v_total FROM contribution_allocations WHERE contribution_id = v_contribution_id;
    IF TG_OP = 'INSERT' THEN v_total := v_total + NEW.amount; END IF;
    IF TG_OP = 'UPDATE' THEN
        v_total := v_total - OLD.amount + NEW.amount;
    END IF;
    IF v_total > v_amount THEN
        RAISE EXCEPTION 'Total allocations cannot exceed the contribution amount';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER trg_contribution_allocation_cap
BEFORE INSERT OR UPDATE ON contribution_allocations
FOR EACH ROW EXECUTE FUNCTION check_contribution_allocation_cap();

-- Block silent reclassification of fund pools once created. Use a separate
-- authorised correction workflow and append a ledger event if correction is needed.
CREATE OR REPLACE FUNCTION prevent_fund_pool_reclassification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.source_origin <> OLD.source_origin OR NEW.fund_class <> OLD.fund_class
       OR NEW.receipt_class <> OLD.receipt_class OR NEW.purpose <> OLD.purpose THEN
        RAISE EXCEPTION 'Fund-pool classifications cannot be overwritten; create a controlled replacement/correction';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_fund_pool_classification_immutable
BEFORE UPDATE ON fund_pools
FOR EACH ROW EXECUTE FUNCTION prevent_fund_pool_reclassification();

-- Require a supervisor approval (and independent approval where sampled) before
-- an activity can be set to VERIFIED. The service must also enforce role scope.
CREATE OR REPLACE FUNCTION require_attestations_for_verified_impact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_supervisor_ok BOOLEAN; v_independent_ok BOOLEAN; v_evidence_count INTEGER; v_needs_check BOOLEAN;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_needs_check := (NEW.impact_state = 'VERIFIED');
    ELSE
        v_needs_check := (NEW.impact_state = 'VERIFIED' AND OLD.impact_state <> 'VERIFIED');
    END IF;
    IF v_needs_check THEN
        SELECT EXISTS (SELECT 1 FROM attestations a WHERE a.activity_id = NEW.id
                       AND a.level = 'SUPERVISOR_REVIEW' AND a.decision = 'APPROVE') INTO v_supervisor_ok;
        SELECT EXISTS (SELECT 1 FROM attestations a WHERE a.activity_id = NEW.id
                       AND a.level = 'INDEPENDENT_SAMPLE' AND a.decision = 'APPROVE') INTO v_independent_ok;
        SELECT COUNT(*) INTO v_evidence_count FROM evidence_files e WHERE e.activity_id = NEW.id;
        IF v_evidence_count = 0 OR NOT v_supervisor_ok THEN
            RAISE EXCEPTION 'Activity requires evidence and supervisor approval before it can be verified';
        END IF;
        IF NEW.independent_review_required AND NOT v_independent_ok THEN
            RAISE EXCEPTION 'Activity requires independent sample approval before it can be verified';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_activity_verified_requires_attestation
BEFORE INSERT OR UPDATE ON activity_events
FOR EACH ROW EXECUTE FUNCTION require_attestations_for_verified_impact();

-- Ensure an activity submitter cannot approve their own activity at supervisor or
-- independent review level. Field submission itself is represented by activity_events.
CREATE OR REPLACE FUNCTION prevent_self_attestation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_submitter UUID;
BEGIN
    SELECT submitted_by INTO v_submitter FROM activity_events WHERE id = NEW.activity_id;
    IF NEW.level IN ('SUPERVISOR_REVIEW','INDEPENDENT_SAMPLE') AND NEW.reviewer_id = v_submitter THEN
        RAISE EXCEPTION 'Activity submitter cannot approve their own submission';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_no_self_attestation
BEFORE INSERT ON attestations
FOR EACH ROW EXECUTE FUNCTION prevent_self_attestation();

-- Balance journal entries at transaction commit.
CREATE OR REPLACE FUNCTION assert_journal_entry_balanced(p_entry_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_status journal_entry_status; v_debits NUMERIC(14,2); v_credits NUMERIC(14,2); v_lines INTEGER;
BEGIN
    SELECT status INTO v_status FROM journal_entries WHERE id = p_entry_id;
    IF NOT FOUND OR v_status <> 'POSTED' THEN RETURN; END IF;
    SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0), COUNT(*)
      INTO v_debits, v_credits, v_lines FROM journal_lines WHERE journal_entry_id = p_entry_id;
    IF v_lines < 2 OR v_debits <> v_credits OR v_debits <= 0 THEN
        RAISE EXCEPTION 'Posted journal entry must contain at least two lines and balanced debit/credit totals';
    END IF;
END;
$$;
CREATE OR REPLACE FUNCTION check_journal_balance_from_line()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_entry_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN v_entry_id := OLD.journal_entry_id; ELSE v_entry_id := NEW.journal_entry_id; END IF;
    PERFORM assert_journal_entry_balanced(v_entry_id);
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE OR REPLACE FUNCTION check_journal_balance_from_header()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM assert_journal_entry_balanced(NEW.id);
    RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER trg_journal_lines_balanced
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION check_journal_balance_from_line();
CREATE CONSTRAINT TRIGGER trg_journal_header_balanced
AFTER INSERT OR UPDATE ON journal_entries
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION check_journal_balance_from_header();

-- Application/service must additionally enforce:
-- 1) allocation/disbursement total <= available pool balance using locked rows/transactions;
-- 2) only authorised roles may post journal entries or attest activities;
-- 3) tax treatment is configured by applicable tax year and approved by a CA;
-- 4) all ledger event sequence allocation uses an organisation-level transaction lock;
-- 5) public receipt response is token-gated and allowlisted; no anonymous DB access;
-- 6) no raw personal data, signed upload URLs or evidence object keys enter event payloads.

COMMIT;
