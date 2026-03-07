import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

async function setup() {
  console.log('Creating tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'coach', 'player')),
      phone VARCHAR(20),
      group_name VARCHAR(50),
      sessions_remaining INTEGER DEFAULT 0,
      balance NUMERIC(10,2) DEFAULT 0,
      loyalty_points INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh_key TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, endpoint)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      group_name VARCHAR(50) NOT NULL,
      coach_id INTEGER REFERENCES users(id),
      start_time TIMESTAMP NOT NULL,
      capacity INTEGER DEFAULT 24,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES sessions(id),
      player_id INTEGER REFERENCES users(id),
      status VARCHAR(10) CHECK (status IN ('present', 'absent')),
      marked_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(session_id, player_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      sent_at TIMESTAMP DEFAULT NOW(),
      read BOOLEAN DEFAULT FALSE
    )
  `;

  console.log('Tables created.');

  // Seed demo users
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin123!', salt);
  const coachHash = await bcrypt.hash('Coach123!', salt);
  const playerHash = await bcrypt.hash('Player123!', salt);

  console.log('Seeding users...');

  // Admin
  await sql`
    INSERT INTO users (email, password_hash, name, role, phone)
    VALUES ('admin@wolves.jo', ${adminHash}, 'Admin User', 'admin', '+962791000001')
    ON CONFLICT (email) DO UPDATE SET password_hash = ${adminHash}, name = 'Admin User'
  `;

  // Coaches
  await sql`
    INSERT INTO users (email, password_hash, name, role, phone)
    VALUES ('coach.sam@wolves.jo', ${coachHash}, 'Coach Sam', 'coach', '+962791000002')
    ON CONFLICT (email) DO UPDATE SET password_hash = ${coachHash}, name = 'Coach Sam'
  `;

  await sql`
    INSERT INTO users (email, password_hash, name, role, phone)
    VALUES ('coach.mike@wolves.jo', ${coachHash}, 'Coach Mike', 'coach', '+962791000003')
    ON CONFLICT (email) DO UPDATE SET password_hash = ${coachHash}, name = 'Coach Mike'
  `;

  // Players
  const players = [
    { email: 'ahmad@wolves.jo', name: 'Ahmad Jordan', group: 'G1', sessions: 12, balance: 50, loyalty: 150 },
    { email: 'zaid@wolves.jo', name: 'Zaid Khalil', group: 'G1', sessions: 8, balance: 0, loyalty: 200 },
    { email: 'omar@wolves.jo', name: 'Omar Hassan', group: 'G2', sessions: 15, balance: 45, loyalty: 120 },
    { email: 'laila@wolves.jo', name: 'Laila Saeed', group: 'G2', sessions: 6, balance: 120, loyalty: 80 },
    { email: 'kareem@wolves.jo', name: 'Kareem Nasser', group: 'G1', sessions: 0, balance: 0, loyalty: 50 },
    { email: 'dana@wolves.jo', name: 'Dana Ramirez', group: 'G3', sessions: 20, balance: 90, loyalty: 300 },
  ];

  for (const p of players) {
    await sql`
      INSERT INTO users (email, password_hash, name, role, phone, group_name, sessions_remaining, balance, loyalty_points)
      VALUES (${p.email}, ${playerHash}, ${p.name}, 'player', '+96279100000', ${p.group}, ${p.sessions}, ${p.balance}, ${p.loyalty})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = ${playerHash}, name = ${p.name}, group_name = ${p.group},
        sessions_remaining = ${p.sessions}, balance = ${p.balance}, loyalty_points = ${p.loyalty}
    `;
  }

  console.log('Users seeded.');

  // Seed sessions
  const coaches = await sql`SELECT id, name FROM users WHERE role = 'coach'`;
  const coachSam = coaches.find(c => c.name === 'Coach Sam');
  const coachMike = coaches.find(c => c.name === 'Coach Mike');

  if (coachSam && coachMike) {
    await sql`
      INSERT INTO sessions (group_name, coach_id, start_time, capacity)
      VALUES ('G1', ${coachSam.id}, NOW() + INTERVAL '1 day' + INTERVAL '17 hours', 24)
      ON CONFLICT DO NOTHING
    `;
    await sql`
      INSERT INTO sessions (group_name, coach_id, start_time, capacity)
      VALUES ('G2', ${coachMike.id}, NOW() + INTERVAL '1 day' + INTERVAL '18 hours', 20)
      ON CONFLICT DO NOTHING
    `;
    await sql`
      INSERT INTO sessions (group_name, coach_id, start_time, capacity)
      VALUES ('G3', ${coachSam.id}, NOW() + INTERVAL '2 days' + INTERVAL '16 hours', 16)
      ON CONFLICT DO NOTHING
    `;
    console.log('Sessions seeded.');
  }

  console.log('Database setup complete!');
}

setup().catch(console.error);
