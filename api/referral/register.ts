import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { sql } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, password, referralCode } = req.body;

  if (!name || !email || !password || !referralCode) {
    return res.status(400).json({ error: 'Name, email, password, and referral code are required' });
  }

  // Validate referral code
  const referrers = await sql`
    SELECT id, name FROM users WHERE referral_code = ${referralCode.toUpperCase().trim()}
  `;
  if (referrers.length === 0) {
    return res.status(400).json({ error: 'Invalid referral code' });
  }
  const referrer = referrers[0];

  // Check if email already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
  if (existing.length > 0) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  // Create user
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate referral code for the new user
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let newCode = 'WLV-';
  for (let i = 0; i < 4; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

  const newUsers = await sql`
    INSERT INTO users (name, email, phone, password_hash, role, referral_code, referred_by, group_name, sessions_remaining, balance, loyalty_points)
    VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${phone || null}, ${passwordHash}, 'player', ${newCode}, ${referrer.id}, 'G3', 0, 0, 0)
    RETURNING id
  `;

  const newUserId = newUsers[0].id;

  // Create referral record
  await sql`
    INSERT INTO referrals (referrer_id, referred_id, status)
    VALUES (${referrer.id}, ${newUserId}, 'pending')
  `;

  return res.json({
    success: true,
    message: `Welcome to Wolves Academy! You were referred by ${referrer.name}.`,
  });
}
