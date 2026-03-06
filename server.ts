import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("wolves.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK(role IN ('admin', 'coach', 'player')) NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    group_name TEXT,
    sessions_remaining INTEGER DEFAULT 0,
    balance DECIMAL(10,2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT NOT NULL,
    coach_id INTEGER,
    start_time DATETIME NOT NULL,
    capacity INTEGER DEFAULT 15,
    FOREIGN KEY(coach_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    player_id INTEGER,
    status TEXT CHECK(status IN ('present', 'absent', 'pending')) DEFAULT 'pending',
    marked_at DATETIME,
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(player_id) REFERENCES players(id)
  );

  CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    coach_id INTEGER,
    shooting INTEGER,
    footwork INTEGER,
    dribbling INTEGER,
    iq INTEGER,
    behavior INTEGER,
    handles INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player_id) REFERENCES players(id),
    FOREIGN KEY(coach_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    amount DECIMAL(10,2),
    method TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(player_id) REFERENCES players(id)
  );
`);

// Seed initial data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)");
  insertUser.run("Admin User", "admin@wolves.jo", "admin", "password");
  insertUser.run("Coach Sam", "coach@wolves.jo", "coach", "password");
  insertUser.run("Ahmad Jordan", "player@wolves.jo", "player", "password");

  const playerUser = db.prepare("SELECT id FROM users WHERE role = 'player'").get() as { id: number };
  db.prepare("INSERT INTO players (user_id, group_name, sessions_remaining, balance, loyalty_points) VALUES (?, ?, ?, ?, ?)").run(playerUser.id, "G1", 12, 50.00, 150);

  const coachUser = db.prepare("SELECT id FROM users WHERE role = 'coach'").get() as { id: number };
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(17, 0, 0, 0);

  db.prepare("INSERT INTO sessions (group_name, coach_id, start_time) VALUES (?, ?, ?)").run("G1", coachUser.id, tomorrow.toISOString());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stats", (req, res) => {
    const totalPlayers = db.prepare("SELECT COUNT(*) as count FROM players").get();
    const totalRevenue = db.prepare("SELECT SUM(amount) as total FROM payments WHERE status = 'completed'").get();
    const upcomingSessions = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE start_time > datetime('now')").get();
    res.json({ totalPlayers, totalRevenue, upcomingSessions });
  });

  app.get("/api/players", (req, res) => {
    const players = db.prepare(`
      SELECT p.*, u.name, u.email 
      FROM players p 
      JOIN users u ON p.user_id = u.id
    `).all();
    res.json(players);
  });

  app.get("/api/sessions", (req, res) => {
    const sessions = db.prepare(`
      SELECT s.*, u.name as coach_name 
      FROM sessions s 
      LEFT JOIN users u ON s.coach_id = u.id
      ORDER BY start_time ASC
    `).all();
    res.json(sessions);
  });

  app.post("/api/attendance", (req, res) => {
    const { sessionId, playerId, status } = req.body;
    db.prepare(`
      INSERT INTO attendance (session_id, player_id, status, marked_at) 
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET status=excluded.status, marked_at=datetime('now')
    `).run(sessionId, playerId, status);

    if (status === 'present') {
      db.prepare("UPDATE players SET sessions_remaining = sessions_remaining - 1 WHERE id = ?").run(playerId);
    }
    res.json({ success: true });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, userId } = req.body;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      // Get user context
      const userData = db.prepare(`
        SELECT u.name, p.* 
        FROM users u 
        LEFT JOIN players p ON u.id = p.user_id 
        WHERE u.id = ?
      `).get(userId) as any;

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
        model,
        contents: message,
        config: { systemInstruction }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
