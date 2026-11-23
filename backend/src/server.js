import 'dotenv/config';
import app from './app.js';
import { closePool } from './config/db.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`[server] LoveAll Transparency Ledger API listening on port ${PORT}`);
  console.log(`[server] ENV=${process.env.NODE_ENV} | API=/api/v1`);
});

async function shutdown(signal) {
  console.log(`[server] ${signal} — shutting down gracefully...`);
  server.close(async () => {
    await closePool();
    console.log('[server] Shutdown complete.');
    process.exit(0);
  });
  setTimeout(() => { console.error('[server] Forced shutdown.'); process.exit(1); }, 15_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => { console.error('[server] Uncaught:', err); shutdown('uncaughtException'); });
process.on('unhandledRejection', (r) => { console.error('[server] Unhandled rejection:', r); shutdown('unhandledRejection'); });

export default server;
