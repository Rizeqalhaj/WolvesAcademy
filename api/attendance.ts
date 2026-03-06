import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, playerId, status } = req.body;
  const db = await getDb();

  db.run(
    "INSERT INTO attendance (session_id, player_id, status, marked_at) VALUES (?, ?, ?, datetime('now'))",
    [sessionId, playerId, status]
  );

  if (status === 'present') {
    db.run("UPDATE players SET sessions_remaining = sessions_remaining - 1 WHERE id = ?", [playerId]);
  }

  res.json({ success: true });
}
