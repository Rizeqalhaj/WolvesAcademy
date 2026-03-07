import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (payload.role === 'player') {
    return res.status(403).json({ error: 'Players cannot mark attendance' });
  }

  const { sessionId, playerId, status } = req.body;

  await sql`
    INSERT INTO attendance (session_id, player_id, status, marked_at)
    VALUES (${sessionId}, ${playerId}, ${status}, NOW())
    ON CONFLICT (session_id, player_id) DO UPDATE SET status = ${status}, marked_at = NOW()
  `;

  if (status === 'present') {
    await sql`
      UPDATE users SET sessions_remaining = sessions_remaining - 1
      WHERE id = ${playerId} AND sessions_remaining > 0
    `;
  }

  return res.json({ success: true });
}
