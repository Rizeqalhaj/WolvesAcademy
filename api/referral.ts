import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import bcrypt from 'bcryptjs';
import { sql } from './_db.js';
import { verifyToken } from './_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  switch (action) {
    case 'code':
      return handleCode(req, res);
    case 'stats':
      return handleStats(req, res);
    case 'register':
      return handleRegister(req, res);
    case 'list':
      return handleList(req, res);
    case 'approve':
      return handleApprove(req, res);
    default:
      return res.status(404).json({ error: 'Unknown referral action' });
  }
}

async function handleCode(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const users = await sql`SELECT referral_code, name FROM users WHERE id = ${payload.userId}`;
  if (users.length === 0) return res.status(404).json({ error: 'User not found' });

  const { referral_code, name } = users[0];
  const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://wolves-academy.vercel.app';
  const shareUrl = `${baseUrl}/?ref=${referral_code}`;
  const shareText = `Join me at Wolves Sports Academy! Use my code ${referral_code} for a free bonus session \u{1F3C0}\n${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return res.json({ code: referral_code, name, shareUrl, shareText, whatsappUrl });
}

async function handleStats(req: VercelRequest, res: VercelResponse) {
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
    .filter((r: any) => r.status === 'rewarded')
    .reduce((sum: number, r: any) => sum + (r.referrer_reward || 0), 0);

  return res.json({ totalReferred, totalSessionsEarned, referrals });
}

async function handleRegister(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, password, referralCode } = req.body;
  if (!name || !email || !password || !referralCode) {
    return res.status(400).json({ error: 'Name, email, password, and referral code are required' });
  }

  const referrers = await sql`SELECT id, name FROM users WHERE referral_code = ${referralCode.toUpperCase().trim()}`;
  if (referrers.length === 0) return res.status(400).json({ error: 'Invalid referral code' });
  const referrer = referrers[0];

  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
  if (existing.length > 0) return res.status(400).json({ error: 'An account with this email already exists' });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let newCode = 'WLV-';
  for (let i = 0; i < 4; i++) newCode += chars[Math.floor(Math.random() * chars.length)];

  const newUsers = await sql`
    INSERT INTO users (name, email, phone, password_hash, role, referral_code, referred_by, group_name, sessions_remaining, balance, loyalty_points)
    VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${phone || null}, ${passwordHash}, 'player', ${newCode}, ${referrer.id}, 'G3', 0, 0, 0)
    RETURNING id
  `;

  await sql`INSERT INTO referrals (referrer_id, referred_id, status) VALUES (${referrer.id}, ${newUsers[0].id}, 'pending')`;

  return res.json({ success: true, message: `Welcome to Wolves Academy! You were referred by ${referrer.name}.` });
}

async function handleList(req: VercelRequest, res: VercelResponse) {
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
    SELECT COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'pending') as pending,
           COUNT(*) FILTER (WHERE status = 'rewarded') as rewarded
    FROM referrals
  `;

  return res.json({ referrals, stats });
}

async function handleApprove(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { referralId } = req.body;
  if (!referralId) return res.status(400).json({ error: 'referralId is required' });

  const referrals = await sql`
    SELECT r.*, referrer.name as referrer_name, referred.name as referred_name
    FROM referrals r
    JOIN users referrer ON r.referrer_id = referrer.id
    JOIN users referred ON r.referred_id = referred.id
    WHERE r.id = ${referralId}
  `;
  if (referrals.length === 0) return res.status(404).json({ error: 'Referral not found' });

  const referral = referrals[0];
  if (referral.status === 'rewarded') return res.status(400).json({ error: 'Already rewarded' });

  await sql`UPDATE users SET sessions_remaining = sessions_remaining + ${referral.referrer_reward} WHERE id = ${referral.referrer_id}`;
  await sql`UPDATE users SET sessions_remaining = sessions_remaining + ${referral.referred_reward} WHERE id = ${referral.referred_id}`;
  await sql`UPDATE users SET loyalty_points = loyalty_points + 50 WHERE id = ${referral.referrer_id}`;
  await sql`UPDATE referrals SET status = 'rewarded', rewarded_at = NOW() WHERE id = ${referralId}`;

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    const referrerSubs = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${referral.referrer_id}`;
    for (const sub of referrerSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          JSON.stringify({ title: 'Referral Reward!', body: `+${referral.referrer_reward} sessions earned! ${referral.referred_name} joined Wolves`, icon: '/wolves-icon-192.png' }),
        );
      } catch {}
    }

    const referredSubs = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${referral.referred_id}`;
    for (const sub of referredSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          JSON.stringify({ title: 'Welcome Bonus!', body: `+${referral.referred_reward} bonus session added to your account!`, icon: '/wolves-icon-192.png' }),
        );
      } catch {}
    }
  }

  return res.json({
    success: true,
    message: `Rewarded: ${referral.referrer_name} +${referral.referrer_reward} sessions, ${referral.referred_name} +${referral.referred_reward} session`,
  });
}
