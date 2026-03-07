import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = verifyToken(req);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const users = await sql`
    SELECT id, name, email, role, group_name, sessions_remaining, balance, loyalty_points
    FROM users WHERE id = ${payload.userId}
  `;

  if (users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({ user: users[0] });
}
