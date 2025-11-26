/**
 * Direct database schema initialization script
 * Use this to create tables when drizzle-kit push isn't working
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initSchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...');

  // Create postgres connection
  const sql = postgres(databaseUrl, {
    ssl: 'require',
  });

  try {
    console.log('Reading SQL schema file...');

    // Read the SQL file
    const sqlFilePath = join(__dirname, '../../init_schema.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');

    console.log('Executing schema creation SQL...');

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        successCount++;

        // Extract table/enum name for logging
        const match = statement.match(/CREATE\s+(TABLE|TYPE|INDEX|UNIQUE INDEX)\s+["']?(\w+)["']?/i);
        if (match) {
          console.log(`✓ Created ${match[1]}: ${match[2]}`);
        }
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists')) {
          const match = statement.match(/CREATE\s+(TABLE|TYPE|INDEX|UNIQUE INDEX)\s+["']?(\w+)["']?/i);
          if (match) {
            console.log(`⊙ ${match[1]} already exists: ${match[2]}`);
          }
          successCount++;
        } else {
          console.error(`✗ Error executing statement:`, error.message);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\nVerifying tables...');

    // Verify tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('\nExisting tables:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Verify enums exist
    const enums = await sql`
      SELECT typname
      FROM pg_type
      WHERE typcategory = 'E'
      ORDER BY typname
    `;

    console.log('\nExisting enum types:');
    enums.forEach(e => console.log(`  - ${e.typname}`));

    console.log('\n✓ Schema initialization complete!');

  } catch (error) {
    console.error('Fatal error during schema initialization:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the initialization
initSchema()
  .then(() => {
    console.log('\n✓ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Failed to initialize schema:', error);
    process.exit(1);
  });
