export function errorHandler(err, req, res, next) {
  // PostgreSQL trigger / constraint errors
  if (err.code === 'P0001') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Check constraint violation.', detail: err.detail ?? err.message });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Foreign key violation.', detail: err.detail ?? err.message });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Unique constraint violation.', detail: err.detail ?? err.message });
  }
  // 22P02: invalid_text_representation — malformed UUID or enum value passed to PostgreSQL
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid format: ' + (err.message ?? 'malformed input value.') });
  }
  // Zod validation
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed.', details: err.errors });
  }
  // JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: err.message });
  }
  const status = err.status ?? err.statusCode ?? 500;
  if (status >= 500) {
    console.error('[server] Unhandled error:', err);
  }
  return res.status(status).json({
    error: status >= 500 ? 'Internal server error.' : (err.message ?? 'An error occurred.'),
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}),
  });
}
