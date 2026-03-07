import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (payload.role === 'player') {
    const players = await sql`
      SELECT id, name, email, group_name, sessions_remaining, balance, loyalty_points
      FROM users WHERE id = ${payload.userId}
    `;
    return res.json(players);
  }

  const players = await sql`
    SELECT id, name, email, group_name, sessions_remaining, balance, loyalty_points
    FROM users WHERE role = 'player' ORDER BY name
  `;
  return res.json(players);
}
