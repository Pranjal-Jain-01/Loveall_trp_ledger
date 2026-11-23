/**
 * jest.globalTeardown.js
 *
 * Called once by Jest after ALL test suites have finished.
 * Closes the shared pg Pool so Jest exits cleanly without
 * "open handle" warnings about lingering database connections.
 *
 * Registered via "globalTeardown" in package.json jest config.
 */
export default async function globalTeardown() {
  try {
    const { closePool } = await import('./src/config/db.js');
    await closePool();
  } catch {
    // Pool may already be closed or was never opened (no DATABASE_URL) — ignore
  }
}
