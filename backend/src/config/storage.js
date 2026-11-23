/**
 * storage.js — Object Storage abstraction stub (ESM)
 *
 * Supports three providers: local filesystem, AWS S3, and GCS.
 * Actual SDK integrations are stubbed; swap in real SDKs for production.
 *
 * IMPORTANT: object_key values must NEVER be returned in public-facing API responses
 * or included in ledger event payloads (ER-09 PII guard).
 */
import { join, dirname } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import { createHash } from 'crypto';

const PROVIDER = process.env.STORAGE_PROVIDER ?? 'local';
export const BUCKET = process.env.STORAGE_BUCKET ?? 'lvall-evidence';
const LOCAL_PATH = process.env.STORAGE_LOCAL_PATH ?? './uploads';

/**
 * Uploads a file buffer to the configured object storage.
 *
 * @param {Object} params
 * @param {Buffer} params.buffer    — File contents
 * @param {string} params.key       — Storage key / object path
 * @param {string} params.mimeType  — MIME type
 * @param {Object} [params.metadata] — Additional metadata tags
 * @returns {Promise<{ key: string, sha256: string, sizeBytes: number }>}
 *   NOTE: No 'url' field returned — consumers must call getPresignedUrl separately to avoid
 *   accidentally serialising signed_url into API responses.
 */
export async function upload({ buffer, key, mimeType, metadata = {} }) {
  const sha256 = createHash('sha256').update(buffer).digest('hex');

  if (PROVIDER === 'local') {
    const dest = join(LOCAL_PATH, key);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buffer);
    return { key, sha256, sizeBytes: buffer.length };
  }

  if (PROVIDER === 's3') {
    throw new Error('[storage] S3 provider not yet implemented. Set STORAGE_PROVIDER=local for development.');
  }

  if (PROVIDER === 'gcs') {
    throw new Error('[storage] GCS provider not yet implemented.');
  }

  throw new Error(`[storage] Unknown STORAGE_PROVIDER: ${PROVIDER}`);
}

/**
 * Generates a time-limited pre-signed URL (or local redirect URL).
 * MUST NOT be called in the public-receipts code path (ER-09 guard).
 *
 * @param {string} key        — Storage object key
 * @param {number} [expiresIn=3600]  — TTL in seconds
 * @returns {Promise<string>}  Presigned URL — keep server-side only, never serialise to public responses
 */
export async function getPresignedUrl(key, expiresIn = 3600) {
  if (PROVIDER === 'local') {
    return `/uploads/${key}`;
  }
  if (PROVIDER === 's3') {
    throw new Error('[storage] S3 presigned URLs not yet implemented.');
  }
  throw new Error(`[storage] getPresignedUrl not implemented for provider: ${PROVIDER}`);
}

/**
 * Deletes an object from storage. Used during GDPR erasure workflows.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function remove(key) {
  if (PROVIDER === 'local') {
    const dest = join(LOCAL_PATH, key);
    await rm(dest, { force: true });
    return;
  }
  throw new Error(`[storage] remove not implemented for provider: ${PROVIDER}`);
}
