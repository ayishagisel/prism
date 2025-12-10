const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function createTable() {
  const sql = postgres(connectionString);

  try {
    console.log('Connecting to database...');

    // Test connection
    const result = await sql`SELECT 1 as connected`;
    console.log('✓ Connected');

    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS zoho_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id uuid NOT NULL,
        access_token text NOT NULL,
        refresh_token text NOT NULL,
        expires_at timestamp NOT NULL,
        scope text,
        api_domain text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;

    console.log('✓ Table created');

    // Create indexes
    try {
      await sql`CREATE UNIQUE INDEX zoho_tokens_agency_id_idx ON zoho_tokens(agency_id);`;
      console.log('✓ Unique index created');
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    try {
      await sql`CREATE INDEX zoho_tokens_expires_at_idx ON zoho_tokens(expires_at);`;
      console.log('✓ Expires_at index created');
    } catch (e) {
      if (!e.message.includes('already exists')) throw e;
    }

    console.log('\n✓✓✓ zoho_tokens table setup complete!');

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createTable();
