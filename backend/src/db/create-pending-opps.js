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
    console.log('🔄 Creating pending_opportunities table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS pending_opportunities (
        id text PRIMARY KEY,
        agency_id text NOT NULL REFERENCES agencies(id),
        email_from text NOT NULL,
        email_subject text NOT NULL,
        email_body text NOT NULL,
        email_html text,
        parsed_title text,
        parsed_description text,
        parsed_deadline timestamp,
        parsed_media_type text,
        parsed_outlet_name text,
        source_email_id text,
        status text NOT NULL DEFAULT 'pending_review',
        assigned_client_ids jsonb DEFAULT '[]',
        assigned_by_user_id text REFERENCES agency_users(id),
        notes text,
        raw_email_data jsonb,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `;
    console.log('✓ pending_opportunities table created');

    await sql`CREATE INDEX IF NOT EXISTS pending_opps_agency_id_idx ON pending_opportunities(agency_id);`;
    await sql`CREATE INDEX IF NOT EXISTS pending_opps_status_idx ON pending_opportunities(status);`;
    await sql`CREATE INDEX IF NOT EXISTS pending_opps_email_id_idx ON pending_opportunities(source_email_id);`;
    console.log('✓ Indexes created');

    console.log('\n✅ pending_opportunities table setup complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setup();
