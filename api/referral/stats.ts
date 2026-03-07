import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const referrals = await sql`
    SELECT r.id, r.status, r.created_at, r.rewarded_at, r.referrer_reward,
           u.name as referred_name, u.email as referred_email
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    WHERE r.referrer_id = ${payload.userId}
    ORDER BY r.created_at DESC
  `;

  const totalReferred = referrals.length;
  const totalSessionsEarned = referrals
    .filter(r => r.status === 'rewarded')
    .reduce((sum, r) => sum + (r.referrer_reward || 0), 0);

  return res.json({
    totalReferred,
    totalSessionsEarned,
    referrals,
  });
}
