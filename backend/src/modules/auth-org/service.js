/**
 * auth-org/service.js
 * Business logic for organisations, users, memberships, and statutory registrations.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../../config/db.js';

const SALT_ROUNDS = 12;

// ─── Auth ──────────────────────────────────────────────────────────────────

/**
 * Register a new user + organisation atomically.
 * Returns { user, organisation, token }
 */
export async function register({ email, password, display_name, organisation_name, organisation_type }) {
  return withTransaction(async (client) => {
    // Check email uniqueness
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      const err = new Error('Email already registered.'); err.status = 409; throw err;
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, display_name, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, display_name, is_active, created_at`,
      [email, password_hash, display_name]
    );
    const user = userRes.rows[0];

    const orgRes = await client.query(
      `INSERT INTO organisations (name, organisation_type, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING id, name, organisation_type, status, created_at`,
      [organisation_name, organisation_type]
    );
    const organisation = orgRes.rows[0];

    await client.query(
      `INSERT INTO organisation_memberships (organisation_id, user_id, role, is_active)
       VALUES ($1, $2, 'ORG_ADMIN', TRUE)`,
      [organisation.id, user.id]
    );

    const token = _signJwt(user);
    return { user: _safeUser(user), organisation, token };
  });
}

/**
 * Login with email + password, return JWT and update last_login_at.
 */
export async function login({ email, password }) {
  const res = await query(
    `SELECT id, email, display_name, password_hash, is_active FROM users WHERE email = $1`,
    [email]
  );
  if (!res.rows.length) {
    const err = new Error('Invalid credentials.'); err.status = 401; throw err;
  }
  const user = res.rows[0];
  if (!user.is_active) {
    const err = new Error('Account disabled.'); err.status = 403; throw err;
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const err = new Error('Invalid credentials.'); err.status = 401; throw err;
  }

  // Non-blocking update of last_login_at
  query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]).catch(() => {});

  const token = _signJwt(user);
  return { token, user: _safeUser(user) };
}

/**
 * Get current user profile.
 */
export async function getMe(userId) {
  const res = await query(
    `SELECT id, email, display_name, is_active, last_login_at, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!res.rows.length) { const err = new Error('User not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Organisations ─────────────────────────────────────────────────────────

export async function createOrganisation({ name, organisation_type }, actorUserId) {
  return withTransaction(async (client) => {
    const orgRes = await client.query(
      `INSERT INTO organisations (name, organisation_type, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING id, name, organisation_type, status, created_at`,
      [name, organisation_type]
    );
    const org = orgRes.rows[0];
    // Add creator as ORG_ADMIN
    await client.query(
      `INSERT INTO organisation_memberships (organisation_id, user_id, role, is_active)
       VALUES ($1, $2, 'ORG_ADMIN', TRUE)`,
      [org.id, actorUserId]
    );
    return org;
  });
}

export async function getOrganisation(organisationId) {
  const res = await query(
    `SELECT id, name, organisation_type, status, created_at FROM organisations WHERE id = $1`,
    [organisationId]
  );
  if (!res.rows.length) { const err = new Error('Organisation not found.'); err.status = 404; throw err; }
  return res.rows[0];
}

// ─── Memberships ───────────────────────────────────────────────────────────

export async function addMembership(organisationId, { user_id, role }) {
  // Confirm target user exists
  const userCheck = await query(`SELECT id FROM users WHERE id = $1`, [user_id]);
  if (!userCheck.rows.length) { const err = new Error('User not found.'); err.status = 404; throw err; }

  const res = await query(
    `INSERT INTO organisation_memberships (organisation_id, user_id, role, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (organisation_id, user_id, role) DO UPDATE SET is_active = TRUE
     RETURNING id, organisation_id, user_id, role, is_active, created_at`,
    [organisationId, user_id, role]
  );
  return res.rows[0];
}

export async function getMemberships(organisationId) {
  const res = await query(
    `SELECT om.id, om.user_id, om.role, om.is_active, u.email, u.display_name
     FROM organisation_memberships om
     JOIN users u ON u.id = om.user_id
     WHERE om.organisation_id = $1
     ORDER BY om.created_at`,
    [organisationId]
  );
  return res.rows;
}

export async function deactivateMembership(organisationId, userId) {
  const res = await query(
    `UPDATE organisation_memberships SET is_active = FALSE
     WHERE organisation_id = $1 AND user_id = $2
     RETURNING id`,
    [organisationId, userId]
  );
  if (!res.rows.length) { const err = new Error('Membership not found.'); err.status = 404; throw err; }
  return { message: 'Membership deactivated.' };
}

// ─── Statutory Registrations ───────────────────────────────────────────────

export async function createRegistration(organisationId, { registration_kind, registration_number, valid_from, valid_until }) {
  const res = await query(
    `INSERT INTO organisation_registrations (organisation_id, registration_kind, registration_number, valid_from, valid_until)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, organisation_id, registration_kind, registration_number, status, valid_from, valid_until, created_at`,
    [organisationId, registration_kind, registration_number, valid_from ?? null, valid_until ?? null]
  );
  return res.rows[0];
}

export async function getRegistrations(organisationId) {
  const res = await query(
    `SELECT id, registration_kind, registration_number, status, valid_from, valid_until, created_at
     FROM organisation_registrations WHERE organisation_id = $1 ORDER BY created_at`,
    [organisationId]
  );
  return res.rows;
}

export async function verifyRegistration(organisationId, regId, { status, reviewer_note }) {
  const existing = await query(
    `SELECT id FROM organisation_registrations WHERE id = $1 AND organisation_id = $2`,
    [regId, organisationId]
  );
  if (!existing.rows.length) { const err = new Error('Registration not found.'); err.status = 404; throw err; }

  const res = await query(
    `UPDATE organisation_registrations
     SET status = $1, reviewer_note = $2, verified_at = CASE WHEN $1 = 'VERIFIED' THEN now() ELSE NULL END
     WHERE id = $3
     RETURNING id, registration_kind, registration_number, status, reviewer_note, verified_at`,
    [status, reviewer_note ?? null, regId]
  );
  return res.rows[0];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function _signJwt(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY ?? '24h' }
  );
}

function _safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}
