import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
    }
    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.' });
    }
    const result = await query('SELECT id, email, is_active FROM users WHERE id = $1', [payload.sub]);
    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive.' });
    }
    req.user = { id: result.rows[0].id, email: result.rows[0].email };
    next();
  } catch (err) {
    next(err);
  }
}
