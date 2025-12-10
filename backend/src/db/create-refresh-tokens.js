const postgres = require('postgres');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

async function setup() {
  const sql = postgres(databaseUrl, { ssl: 'require' });

  try {
    console.log('🔄 Creating refresh_tokens table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id text PRIMARY KEY,
        agency_id text NOT NULL REFERENCES agencies(id),
        user_id text NOT NULL REFERENCES agency_users(id),
        token_hash text NOT NULL,
        expires_at timestamp NOT NULL,
        revoked_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log('✓ refresh_tokens table created');

    await sql`CREATE INDEX IF NOT EXISTS refresh_tokens_agency_id_idx ON refresh_tokens(agency_id);`;
    await sql`CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);`;
    console.log('✓ Indexes created');

    console.log('\n✅ refresh_tokens table setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setup();
