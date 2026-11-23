/**
 * canonicalJson.js — Deterministic JSON serialisation for cryptographic use.
 *
 * Rules:
 * - All object keys sorted recursively
 * - Prohibited PII/secret keys stripped before hashing
 * - Arrays preserved in insertion order (not sorted)
 */

const PROHIBITED_KEYS = new Set([
  'email', 'password_hash', 'donor_name', 'beneficiary_name',
  'object_key', 'signed_url', 'private_key_location_reference',
  'donor_reference', 'payment_provider_reference',
]);

function sortKeys(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  return Object.keys(value)
    .sort()
    .reduce((acc, k) => {
      if (!PROHIBITED_KEYS.has(k)) {
        acc[k] = sortKeys(value[k]);
      }
      return acc;
    }, {});
}

export function toCanonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}

export function fromCanonicalJson(text) {
  return JSON.parse(text);
}
