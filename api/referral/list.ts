import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const referrals = await sql`
    SELECT r.id, r.status, r.referrer_reward, r.referred_reward, r.created_at, r.rewarded_at,
           referrer.name as referrer_name, referrer.email as referrer_email,
           referred.name as referred_name, referred.email as referred_email
    FROM referrals r
    JOIN users referrer ON r.referrer_id = referrer.id
    JOIN users referred ON r.referred_id = referred.id
    ORDER BY r.created_at DESC
  `;

  const [stats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'rewarded') as rewarded
    FROM referrals
  `;

  return res.json({ referrals, stats });
}
