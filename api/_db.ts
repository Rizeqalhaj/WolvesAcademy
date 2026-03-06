import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`
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

  // Seed data
  const [{ values: [[count]] }] = db.exec("SELECT COUNT(*) FROM users");
  if (count === 0) {
    db.run("INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)", ["Admin User", "admin@wolves.jo", "admin", "password"]);
    db.run("INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)", ["Coach Sam", "coach@wolves.jo", "coach", "password"]);
    db.run("INSERT INTO users (name, email, role, password) VALUES (?, ?, ?, ?)", ["Ahmad Jordan", "player@wolves.jo", "player", "password"]);

    const [{ values: [[playerId]] }] = db.exec("SELECT id FROM users WHERE role = 'player'");
    db.run("INSERT INTO players (user_id, group_name, sessions_remaining, balance, loyalty_points) VALUES (?, ?, ?, ?, ?)", [playerId, "G1", 12, 50.00, 150]);

    const [{ values: [[coachId]] }] = db.exec("SELECT id FROM users WHERE role = 'coach'");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);
    db.run("INSERT INTO sessions (group_name, coach_id, start_time) VALUES (?, ?, ?)", ["G1", coachId, tomorrow.toISOString()]);
  }

  return db;
}
