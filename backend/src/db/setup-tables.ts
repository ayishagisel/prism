/**
 * Setup database tables by reading and executing SQL from file
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function setupTables() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🔄 Connecting to database...');

  const sql = postgres(databaseUrl, {
    ssl: 'require',
  });

  try {
    // Read the simplified SQL file
    const sqlFilePath = join(__dirname, '../../COPY_PASTE_TO_NEON.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');

    console.log('📄 Executing SQL schema...\n');

    // Split by semicolon, but handle multi-line statements properly
    const lines = sqlContent.split('\n');
    let currentStatement = '';
    let statementCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }

      currentStatement += ' ' + line;

      // If line ends with semicolon, execute the statement
      if (trimmedLine.endsWith(';')) {
        const statement = currentStatement.trim();

        if (statement && statement.length > 1) {
          try {
            await sql.unsafe(statement);
            statementCount++;

            // Extract first part of statement for logging
            const statementType = statement.split(/\s+/)[0].toUpperCase();
            const statementName = statement.match(/(?:TABLE|TYPE|INDEX)\s+"?(\w+)"?/i)?.[1] || '';

            if (statementName) {
              console.log(`✓ ${statementType}: ${statementName}`);
            }
          } catch (err: any) {
            // Ignore "already exists" errors
            if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
              console.log(`⚠ Already exists: ${statement.substring(0, 50)}...`);
            } else {
              console.error(`✗ Failed: ${statement.substring(0, 50)}...`);
              console.error(`  Error: ${err.message}`);
            }
          }
        }

        currentStatement = '';
      }
    }

    console.log(`\n✅ Executed ${statementCount} SQL statements`);

    // Verify tables exist
    const result = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    if ((result as any[]).length > 0) {
      console.log('\n📊 Created tables:');
      (result as any[]).forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
    }

    await sql.end();
    console.log('\n✅ Database schema setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    await sql.end();
    throw error;
  }
}

setupTables()
  .then(() => {
    console.log('\n🎉 All done! You can now run: npm run seed -w backend');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
