import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = await getDb();

  const [result] = db.exec(`
    SELECT s.id, s.group_name, s.start_time, s.capacity, u.name as coach_name
    FROM sessions s
    LEFT JOIN users u ON s.coach_id = u.id
    ORDER BY start_time ASC
  `);

  if (!result) return res.json([]);

  const sessions = result.values.map((row) => ({
    id: row[0],
    group_name: row[1],
    start_time: row[2],
    capacity: row[3],
    coach_name: row[4]
  }));

  res.json(sessions);
}
