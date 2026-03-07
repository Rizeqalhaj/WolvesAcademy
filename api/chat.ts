import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';
import { verifyToken } from './_auth.js';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  const { message } = req.body;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const users = await sql`
      SELECT name, group_name, sessions_remaining, balance, loyalty_points, role
      FROM users WHERE id = ${payload.userId}
    `;
    const userData = users[0] || {};

    const systemInstruction = `
      You are the AI assistant for Wolves Sports Academy in Amman, Jordan.
      You are helpful, professional, and friendly.
      User Context: ${JSON.stringify(userData)}
      If the user is a player, you know their sessions remaining, balance, and group.
      Academy Info: 240+ players, basketball focus, Amman based.
      Groups: G1 (Elite), G2 (Intermediate), G3 (Beginners).
      Actions you can simulate: balance inquiry, schedule check, payment info.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: { systemInstruction },
    });

    return res.json({ text: response.text });
  } catch {
    return res.status(500).json({ error: 'Failed to process chat' });
  }
}
