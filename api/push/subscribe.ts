import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
      VALUES (${payload.userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh_key = ${subscription.keys.p256dh},
        auth_key = ${subscription.keys.auth}
    `;

    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body;
    await sql`
      DELETE FROM push_subscriptions WHERE user_id = ${payload.userId} AND endpoint = ${endpoint}
    `;
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
