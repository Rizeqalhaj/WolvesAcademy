import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();

  const [totalPlayers] = db.exec("SELECT COUNT(*) as count FROM players");
  const [totalRevenue] = db.exec("SELECT SUM(amount) as total FROM payments WHERE status = 'completed'");
  const [upcomingSessions] = db.exec("SELECT COUNT(*) as count FROM sessions WHERE start_time > datetime('now')");

  res.json({
    totalPlayers: { count: totalPlayers?.values?.[0]?.[0] ?? 0 },
    totalRevenue: { total: totalRevenue?.values?.[0]?.[0] ?? null },
    upcomingSessions: { count: upcomingSessions?.values?.[0]?.[0] ?? 0 }
  });
}
