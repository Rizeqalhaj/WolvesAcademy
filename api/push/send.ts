import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { sql } from '../_db.js';
import { verifyToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { title, body, targetUserIds, targetGroup } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );

  // Get target subscriptions
  let subscriptions;
  if (targetUserIds && targetUserIds.length > 0) {
    // Send to specific users
    subscriptions = await sql`
      SELECT ps.*, u.name as user_name FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE ps.user_id = ANY(${targetUserIds}::int[])
    `;
  } else if (targetGroup) {
    // Send to all users in a group
    subscriptions = await sql`
      SELECT ps.*, u.name as user_name FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.group_name = ${targetGroup}
    `;
  } else {
    // Broadcast to all
    subscriptions = await sql`
      SELECT ps.*, u.name as user_name FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
    `;
  }

  const notificationPayload = JSON.stringify({
    title,
    body: body || '',
    icon: '/wolves-icon-192.png',
    badge: '/wolves-icon-192.png',
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
    };

    try {
      await webpush.sendNotification(pushSub, notificationPayload);
      sent++;

      // Log notification
      await sql`
        INSERT INTO notifications (user_id, title, body)
        VALUES (${sub.user_id}, ${title}, ${body || ''})
      `;
    } catch (err: any) {
      failed++;
      // Remove expired/invalid subscriptions
      if (err.statusCode === 410 || err.statusCode === 404) {
        await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
      }
    }
  }

  return res.json({ sent, failed, total: subscriptions.length });
}
