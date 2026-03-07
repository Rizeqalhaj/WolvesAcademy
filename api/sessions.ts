import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessions = await sql`
    SELECT s.id, s.group_name, s.start_time, s.capacity, u.name as coach_name
    FROM sessions s
    LEFT JOIN users u ON s.coach_id = u.id
    ORDER BY s.start_time ASC
  `;
  return res.json(sessions);
}
