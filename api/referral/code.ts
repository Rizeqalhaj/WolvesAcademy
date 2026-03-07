import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const users = await sql`
    SELECT referral_code, name FROM users WHERE id = ${payload.userId}
  `;
  if (users.length === 0) return res.status(404).json({ error: 'User not found' });

  const { referral_code, name } = users[0];
  const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://wolves-academy.vercel.app';
  const shareUrl = `${baseUrl}/?ref=${referral_code}`;
  const shareText = `Join me at Wolves Sports Academy! Use my code ${referral_code} for a free bonus session 🏀\n${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return res.json({
    code: referral_code,
    name,
    shareUrl,
    shareText,
    whatsappUrl,
  });
}
