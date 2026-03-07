import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const [totalPlayers] = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'player'`;
  const [upcomingSessions] = await sql`SELECT COUNT(*) as count FROM sessions WHERE start_time > NOW()`;

  return res.json({
    totalPlayers: { count: Number(totalPlayers.count) },
    totalRevenue: { total: null },
    upcomingSessions: { count: Number(upcomingSessions.count) },
  });
}
