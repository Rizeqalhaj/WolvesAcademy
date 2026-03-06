import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();

  const [result] = db.exec(`
    SELECT p.id, p.user_id, p.group_name, p.sessions_remaining, p.balance, p.loyalty_points, u.name, u.email
    FROM players p
    JOIN users u ON p.user_id = u.id
  `);

  if (!result) return res.json([]);

  const players = result.values.map((row) => ({
    id: row[0],
    user_id: row[1],
    group_name: row[2],
    sessions_remaining: row[3],
    balance: row[4],
    loyalty_points: row[5],
    name: row[6],
    email: row[7]
  }));

  res.json(players);
}
