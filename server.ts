import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || "wolves-fallback-secret";

// JWT helpers
interface TokenPayload { userId: number; email: string; role: string; }

function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

function verifyToken(authHeader: string | undefined): TokenPayload | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET) as TokenPayload;
  } catch { return null; }
}

// VAPID setup
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || "admin@wolves.jo"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // --- Auth Routes ---
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const users = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase().trim()}`;
    if (users.length === 0) return res.status(401).json({ error: "Invalid email or password" });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role,
        group_name: user.group_name, sessions_remaining: user.sessions_remaining,
        balance: user.balance, loyalty_points: user.loyalty_points },
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const users = await sql`SELECT id, name, email, role, group_name, sessions_remaining, balance, loyalty_points FROM users WHERE id = ${payload.userId}`;
    if (users.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ user: users[0] });
  });

  // --- Data Routes (auth-protected) ---
  app.get("/api/stats", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const [tp] = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'player'`;
    const [us] = await sql`SELECT COUNT(*) as count FROM sessions WHERE start_time > NOW()`;
    res.json({ totalPlayers: { count: Number(tp.count) }, totalRevenue: { total: null }, upcomingSessions: { count: Number(us.count) } });
  });

  app.get("/api/players", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    if (payload.role === "player") {
      const players = await sql`SELECT id, name, email, group_name, sessions_remaining, balance, loyalty_points FROM users WHERE id = ${payload.userId}`;
      return res.json(players);
    }
    const players = await sql`SELECT id, name, email, group_name, sessions_remaining, balance, loyalty_points FROM users WHERE role = 'player' ORDER BY name`;
    res.json(players);
  });

  app.get("/api/sessions", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const sessions = await sql`SELECT s.id, s.group_name, s.start_time, s.capacity, u.name as coach_name FROM sessions s LEFT JOIN users u ON s.coach_id = u.id ORDER BY s.start_time ASC`;
    res.json(sessions);
  });

  app.post("/api/attendance", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    if (payload.role === "player") return res.status(403).json({ error: "Forbidden" });
    const { sessionId, playerId, status } = req.body;
    await sql`INSERT INTO attendance (session_id, player_id, status, marked_at) VALUES (${sessionId}, ${playerId}, ${status}, NOW()) ON CONFLICT (session_id, player_id) DO UPDATE SET status = ${status}, marked_at = NOW()`;
    if (status === "present") {
      await sql`UPDATE users SET sessions_remaining = sessions_remaining - 1 WHERE id = ${playerId} AND sessions_remaining > 0`;
    }
    res.json({ success: true });
  });

  // --- Push Routes ---
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  app.post("/api/push/subscribe", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const { subscription } = req.body;
    await sql`INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key) VALUES (${payload.userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}) ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh_key = ${subscription.keys.p256dh}, auth_key = ${subscription.keys.auth}`;
    res.json({ success: true });
  });

  app.post("/api/push/send", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const { title, body, targetUserIds, targetGroup } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });

    let subscriptions;
    if (targetUserIds?.length > 0) {
      subscriptions = await sql`SELECT ps.*, u.name as user_name FROM push_subscriptions ps JOIN users u ON ps.user_id = u.id WHERE ps.user_id = ANY(${targetUserIds}::int[])`;
    } else if (targetGroup) {
      subscriptions = await sql`SELECT ps.*, u.name as user_name FROM push_subscriptions ps JOIN users u ON ps.user_id = u.id WHERE u.group_name = ${targetGroup}`;
    } else {
      subscriptions = await sql`SELECT ps.*, u.name as user_name FROM push_subscriptions ps JOIN users u ON ps.user_id = u.id`;
    }

    const notifPayload = JSON.stringify({ title, body: body || "", icon: "/wolves-icon-192.png", badge: "/wolves-icon-192.png" });
    let sent = 0, failed = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } }, notifPayload);
        sent++;
        await sql`INSERT INTO notifications (user_id, title, body) VALUES (${sub.user_id}, ${title}, ${body || ""})`;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
        }
      }
    }
    res.json({ sent, failed, total: subscriptions.length });
  });

  // --- Chat Route ---
  app.post("/api/chat", async (req, res) => {
    const payload = verifyToken(req.headers.authorization);
    if (!payload) return res.status(401).json({ error: "Unauthorized" });
    const { message } = req.body;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const users = await sql`SELECT name, group_name, sessions_remaining, balance, loyalty_points, role FROM users WHERE id = ${payload.userId}`;
      const systemInstruction = `You are the AI assistant for Wolves Sports Academy in Amman, Jordan. User Context: ${JSON.stringify(users[0] || {})}. Academy Info: 240+ players, basketball focus, Amman based. Groups: G1 (Elite), G2 (Intermediate), G3 (Beginners).`;
      const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: message, config: { systemInstruction } });
      res.json({ text: response.text });
    } catch {
      res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
