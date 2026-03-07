import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = neon(DATABASE_URL);

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'WLV-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function migrate() {
  console.log('Adding referral columns to users...');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER REFERENCES users(id)`;

  console.log('Creating referrals table...');

  await sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
      referrer_reward INTEGER DEFAULT 2,
      referred_reward INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      rewarded_at TIMESTAMP,
      UNIQUE(referrer_id, referred_id)
    )
  `;

  console.log('Generating referral codes for existing users...');

  const users = await sql`SELECT id, referral_code FROM users WHERE referral_code IS NULL`;

  for (const user of users) {
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      try {
        await sql`UPDATE users SET referral_code = ${code} WHERE id = ${user.id}`;
        console.log(`  User ${user.id}: ${code}`);
        break;
      } catch {
        code = generateCode();
        attempts++;
      }
    }
  }

  const allUsers = await sql`SELECT id, name, referral_code FROM users ORDER BY id`;
  console.log('\nAll referral codes:');
  for (const u of allUsers) {
    console.log(`  ${u.name}: ${u.referral_code}`);
  }

  console.log('\nReferral migration complete!');
}

migrate().catch(console.error);
