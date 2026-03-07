import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { referralId } = req.body;
  if (!referralId) return res.status(400).json({ error: 'referralId is required' });

  // Get referral
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

  // Award sessions
  await sql`UPDATE users SET sessions_remaining = sessions_remaining + ${referral.referrer_reward} WHERE id = ${referral.referrer_id}`;
  await sql`UPDATE users SET sessions_remaining = sessions_remaining + ${referral.referred_reward} WHERE id = ${referral.referred_id}`;

  // Award loyalty points to referrer
  await sql`UPDATE users SET loyalty_points = loyalty_points + 50 WHERE id = ${referral.referrer_id}`;

  // Update referral status
  await sql`UPDATE referrals SET status = 'rewarded', rewarded_at = NOW() WHERE id = ${referralId}`;

  // Send push notifications
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    // Notify referrer
    const referrerSubs = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${referral.referrer_id}`;
    for (const sub of referrerSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          JSON.stringify({ title: 'Referral Reward!', body: `+${referral.referrer_reward} sessions earned! ${referral.referred_name} joined Wolves 🏀`, icon: '/wolves-icon-192.png' }),
        );
      } catch {}
    }

    // Notify referred
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
