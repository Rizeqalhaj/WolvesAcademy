import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, userId } = req.body;

  try {
    const db = await getDb();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const [userResult] = db.exec(`
      SELECT u.name, p.group_name, p.sessions_remaining, p.balance, p.loyalty_points
      FROM users u
      LEFT JOIN players p ON u.id = p.user_id
      WHERE u.id = ?
    `, [userId]);

    const userData = userResult?.values?.[0] ? {
      name: userResult.values[0][0],
      group_name: userResult.values[0][1],
      sessions_remaining: userResult.values[0][2],
      balance: userResult.values[0][3],
      loyalty_points: userResult.values[0][4]
    } : {};

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
      config: { systemInstruction }
    });

    res.json({ text: response.text });
  } catch (error) {
    res.status(500).json({ error: "Failed to process chat" });
  }
}
