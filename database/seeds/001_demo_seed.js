/**
 * database/seeds/001_demo_seed.js
 *
 * Standalone ESM seed script for the LoveAll Transparency Ledger.
 * Run with: node database/seeds/001_demo_seed.js
 *            OR: cd backend && npm run seed
 *
 * Creates:
 *   - 2 Organisations (Foundation + Partner NGO)
 *   - 6 Users (one per role)
 *   - Organisation memberships
 *   - Ed25519 signing keypair for Foundation
 *   - Chart of accounts (9 accounts)
 *   - 2 Fund Pools (DOMESTIC + FOREIGN)
 *   - 2 Programmes
 *   - 1 Verified Funding Agreement (conditional_disbursement_allowed=TRUE)
 *   - 2 Statutory Registrations (12AB + 80G)
 *   - 1 Enabled Compliance Rule
 *   - 1 Sample Contribution with public receipt token
 */

import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PASSWORD = 'LoveAll@2026!';
const SALT_ROUNDS = 12;

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱  Starting seed...\n');

    // ── 1. Users ───────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

    const users = {
      admin:    await upsertUser(client, 'admin@loveall.org',     passwordHash, 'Priya Admin'),
      finance:  await upsertUser(client, 'finance@loveall.org',   passwordHash, 'Ravi Finance'),
      field:    await upsertUser(client, 'field@loveall.org',     passwordHash, 'Meena Field'),
      supervisor: await upsertUser(client, 'supervisor@loveall.org', passwordHash, 'Arjun Supervisor'),
      verifier: await upsertUser(client, 'verifier@loveall.org',  passwordHash, 'Deepa Verifier'),
      auditor:  await upsertUser(client, 'auditor@loveall.org',   passwordHash, 'Suresh Auditor'),
    };
    console.log('✅  Users created:', Object.keys(users).join(', '));

    // ── 2. Organisations ───────────────────────────────────────────────────
    const foundation = await upsertOrg(client, 'LoveAll Foundation', 'FOUNDATION');
    const partnerNgo = await upsertOrg(client, 'GreenHope Partner NGO', 'NGO');
    console.log(`✅  Organisations: ${foundation.name} (${foundation.id}), ${partnerNgo.name} (${partnerNgo.id})`);

    // ── 3. Memberships ─────────────────────────────────────────────────────
    await upsertMembership(client, foundation.id, users.admin.id,      'ORG_ADMIN');
    await upsertMembership(client, foundation.id, users.finance.id,    'FINANCE_OFFICER');
    await upsertMembership(client, foundation.id, users.field.id,      'FIELD_WORKER');
    await upsertMembership(client, foundation.id, users.supervisor.id, 'SUPERVISOR');
    await upsertMembership(client, foundation.id, users.verifier.id,   'INDEPENDENT_VERIFIER');
    await upsertMembership(client, foundation.id, users.auditor.id,    'AUDITOR');
    await upsertMembership(client, partnerNgo.id,  users.admin.id,     'ORG_ADMIN');
    console.log('✅  Memberships created (6 roles in Foundation, Admin in Partner NGO)');

    // ── 4. Ed25519 Signing Key ─────────────────────────────────────────────
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding:  { type: 'spki',  format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const keyRef = 'SIGNING_KEY_DEFAULT';
    await client.query(
      `INSERT INTO signing_keys
         (organisation_id, key_name, key_version, algorithm, public_key_pem,
          private_key_location_reference, status, activated_at)
       VALUES ($1, $2, 1, 'Ed25519', $3, $4, 'ACTIVE', now())
       ON CONFLICT DO NOTHING`,
      [foundation.id, 'dev-key-v1', publicKey, keyRef]
    );
    console.log('✅  Ed25519 signing key created for Foundation\n');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  IMPORTANT: Add this to your backend/.env file:');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`SIGNING_KEY_DEFAULT="${privateKey.replace(/\n/g, '\\n')}"`);
    console.log('══════════════════════════════════════════════════════════════\n');

    // ── 5. Statutory Registrations ─────────────────────────────────────────
    await client.query(
      `INSERT INTO organisation_registrations
         (organisation_id, registration_kind, registration_number, status)
       VALUES ($1, '12AB', 'LOVEALL-12AB-2024-001', 'VERIFIED'),
              ($1, '80G',  'LOVEALL-80G-2024-001',  'VERIFIED')
       ON CONFLICT DO NOTHING`,
      [foundation.id]
    );
    console.log('✅  Statutory registrations: 12AB + 80G (VERIFIED)');

    // ── 6. Chart of Accounts ───────────────────────────────────────────────
    const accounts = await seedAccounts(client, foundation.id);
    console.log('✅  Chart of accounts: 9 accounts created');

    // ── 7. Fund Pools ──────────────────────────────────────────────────────
    const domesticPool = await upsertFundPool(client, foundation.id, {
      pool_code: 'FP-DOM-001', name: 'Domestic General Fund',
      source_origin: 'DOMESTIC', fund_class: 'GENERAL',
      receipt_class: 'DONATION', purpose: 'EDUCATION', currency: 'INR',
    });
    const foreignPool = await upsertFundPool(client, foundation.id, {
      pool_code: 'FP-FOR-001', name: 'Foreign Corpus Fund',
      source_origin: 'FOREIGN', fund_class: 'CORPUS',
      receipt_class: 'DONATION', purpose: 'HEALTHCARE', currency: 'USD',
    });
    console.log(`✅  Fund pools: ${domesticPool.name}, ${foreignPool.name}`);

    // ── 8. Programmes ──────────────────────────────────────────────────────
    const eduProg = await upsertProgramme(client, foundation.id, {
      programme_code: 'PROG-EDU-001', name: 'Rural Education Initiative',
      purpose: 'EDUCATION', description: 'Providing quality education in rural areas',
    });
    const healthProg = await upsertProgramme(client, foundation.id, {
      programme_code: 'PROG-HEALTH-001', name: 'Community Health Drive',
      purpose: 'HEALTHCARE', description: 'Mobile healthcare for underserved communities',
    });
    console.log(`✅  Programmes: ${eduProg.name}, ${healthProg.name}`);

    // ── 9. Funding Agreement ───────────────────────────────────────────────
    const agreement = await client.query(
      `INSERT INTO funding_agreements
         (implementing_organisation_id, funder_organisation_id, agreement_code,
          status, conditional_disbursement_allowed, starts_on, ends_on)
       VALUES ($1, $2, 'FA-2024-LOVEALL-001', 'VERIFIED', TRUE, '2024-01-01', '2026-12-31')
       ON CONFLICT (agreement_code) DO UPDATE SET status = 'VERIFIED'
       RETURNING id`,
      [foundation.id, partnerNgo.id]
    );
    console.log(`✅  Funding agreement created (VERIFIED, conditional_disbursement_allowed=TRUE)`);

    // ── 10. Compliance Rule ────────────────────────────────────────────────
    await client.query(
      `INSERT INTO compliance_rules
         (rule_code, rule_version, jurisdiction, description, configuration,
          effective_from, is_enabled)
       VALUES ('PAYMENT_REF_REQUIRED', '1.0', 'IN',
               'Paid disbursements must have a payment_reference on record',
               '{}', '2024-01-01', TRUE)
       ON CONFLICT DO NOTHING`
    );
    console.log('✅  Compliance rule: PAYMENT_REF_REQUIRED enabled');

    // ── 11. Sample Contribution with receipt token ──────────────────────────
    const contribRes = await client.query(
      `INSERT INTO contributions
         (organisation_id, fund_pool_id, receipt_number,
          amount, currency, source_origin, fund_class, receipt_class, purpose,
          received_at, status)
       VALUES ($1, $2, 'RCP-2024-00001',
               50000, 'INR', 'DOMESTIC', 'GENERAL', 'DONATION', 'EDUCATION',
               '2024-03-15T10:00:00Z', 'RECEIVED')
       RETURNING id`,
      [foundation.id, domesticPool.id]
    );
    const contributionId = contribRes.rows[0].id;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await client.query(
      `INSERT INTO public_receipt_tokens (contribution_id, token_hash, is_active)
       VALUES ($1, $2, TRUE)`,
      [contributionId, tokenHash]
    );
    console.log(`✅  Sample contribution created (ID: ${contributionId})`);
    console.log(`\n🔑  Test public receipt token: ${rawToken}`);
    console.log(`    GET /api/v1/public/receipts/${rawToken}\n`);

    await client.query('COMMIT');
    console.log('\n🎉  Seed complete!\n');
    console.log('Login credentials (all users, password: LoveAll@2026!):');
    for (const [role, user] of Object.entries(users)) {
      console.log(`  ${role.padEnd(12)} — ${user.email}`);
    }
    console.log(`\n  Foundation Org ID: ${foundation.id}`);
    console.log(`  Partner NGO ID:    ${partnerNgo.id}`);
    console.log(`  Domestic Pool ID:  ${domesticPool.id}`);
    console.log(`  Foreign Pool ID:   ${foreignPool.id}`);
    console.log(`  Edu Programme ID:  ${eduProg.id}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed — rolled back:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function upsertUser(client, email, password_hash, display_name) {
  const res = await client.query(
    `INSERT INTO users (email, password_hash, display_name, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
     RETURNING id, email, display_name`,
    [email, password_hash, display_name]
  );
  return res.rows[0];
}

async function upsertOrg(client, name, organisation_type) {
  const res = await client.query(
    `INSERT INTO organisations (name, organisation_type, status)
     VALUES ($1, $2, 'ACTIVE')
     ON CONFLICT DO NOTHING
     RETURNING id, name, organisation_type`,
    [name, organisation_type]
  );
  if (res.rows.length) return res.rows[0];
  // If conflict, fetch existing
  const existing = await client.query(
    `SELECT id, name, organisation_type FROM organisations WHERE name = $1`,
    [name]
  );
  return existing.rows[0];
}

async function upsertMembership(client, organisationId, userId, role) {
  await client.query(
    `INSERT INTO organisation_memberships (organisation_id, user_id, role, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (organisation_id, user_id, role) DO UPDATE SET is_active = TRUE`,
    [organisationId, userId, role]
  );
}

async function upsertFundPool(client, organisationId, data) {
  const res = await client.query(
    `INSERT INTO fund_pools
       (organisation_id, pool_code, name, source_origin, fund_class, receipt_class, purpose, currency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT DO NOTHING
     RETURNING id, pool_code, name`,
    [organisationId, data.pool_code, data.name, data.source_origin,
     data.fund_class, data.receipt_class, data.purpose, data.currency]
  );
  if (res.rows.length) return res.rows[0];
  const existing = await client.query(
    `SELECT id, pool_code, name FROM fund_pools WHERE pool_code = $1`,
    [data.pool_code]
  );
  return existing.rows[0];
}

async function upsertProgramme(client, organisationId, data) {
  const res = await client.query(
    `INSERT INTO programmes (organisation_id, programme_code, name, purpose, description)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING
     RETURNING id, programme_code, name`,
    [organisationId, data.programme_code, data.name, data.purpose, data.description]
  );
  if (res.rows.length) return res.rows[0];
  const existing = await client.query(
    `SELECT id, programme_code, name FROM programmes WHERE programme_code = $1`,
    [data.programme_code]
  );
  return existing.rows[0];
}

async function seedAccounts(client, organisationId) {
  const accounts = [
    ['ACC-1001', 'Cash and Bank',               'ASSET'],
    ['ACC-1002', 'Receivables',                 'ASSET'],
    ['ACC-2001', 'Accounts Payable',            'LIABILITY'],
    ['ACC-2002', 'Deferred Liabilities',        'LIABILITY'],
    ['ACC-3001', 'Corpus Fund',                 'FUND_BALANCE'],
    ['ACC-3002', 'General Fund',                'FUND_BALANCE'],
    ['ACC-4001', 'Donation Income',             'INCOME'],
    ['ACC-4002', 'CSR Income',                  'INCOME'],
    ['ACC-5001', 'Programme Expenses',          'EXPENSE'],
  ];
  const inserted = [];
  for (const [code, name, type] of accounts) {
    const res = await client.query(
      `INSERT INTO chart_of_accounts (organisation_id, account_code, account_name, account_type)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING
       RETURNING id, account_code`,
      [organisationId, code, name, type]
    );
    if (res.rows.length) inserted.push(res.rows[0]);
  }
  return inserted;
}

run().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
