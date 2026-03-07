import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { sql } from '../_db.js';
import { signToken } from '../_auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const users = await sql`
    SELECT id, email, password_hash, name, role, group_name, sessions_remaining, balance, loyalty_points
    FROM users WHERE email = ${email.toLowerCase().trim()}
  `;

  if (users.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = users[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role as 'admin' | 'coach' | 'player',
  });

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      group_name: user.group_name,
      sessions_remaining: user.sessions_remaining,
      balance: user.balance,
      loyalty_points: user.loyalty_points,
    },
  });
}
