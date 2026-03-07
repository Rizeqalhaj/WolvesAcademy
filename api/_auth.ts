import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET || 'wolves-fallback-secret';

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'admin' | 'coach' | 'player';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(req: VercelRequest): TokenPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice(7);
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
