/**
 * Verify that all expected tables and enums exist in the database
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function verifySchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Connecting to database...\n');

  const sql = postgres(databaseUrl, {
    ssl: 'require',
  });

  try {
    // Expected tables
    const expectedTables = [
      'agencies',
      'agency_users',
      'clients',
      'client_users',
      'opportunities',
      'client_opportunity_statuses',
      'follow_up_tasks',
      'activity_logs',
      'notifications',
    ];

    // Expected enums
    const expectedEnums = [
      'agency_user_role',
      'client_user_role',
      'media_type',
      'opportunity_type',
      'opportunity_status',
      'visibility',
      'client_opportunity_response',
      'user_status',
      'client_status',
      'task_status',
      'task_type',
      'notification_channel',
      'notification_status',
    ];

    // Check tables
    console.log('Checking tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const existingTableNames = tables.map(t => t.table_name);

    let tablesOk = true;
    for (const tableName of expectedTables) {
      if (existingTableNames.includes(tableName)) {
        console.log(`  ✓ ${tableName}`);
      } else {
        console.log(`  ✗ ${tableName} - MISSING!`);
        tablesOk = false;
      }
    }

    // Check enums
    console.log('\nChecking ENUM types...');
    const enums = await sql`
      SELECT typname
      FROM pg_type
      WHERE typcategory = 'E'
      ORDER BY typname
    `;

    const existingEnumNames = enums.map(e => e.typname);

    let enumsOk = true;
    for (const enumName of expectedEnums) {
      if (existingEnumNames.includes(enumName)) {
        console.log(`  ✓ ${enumName}`);
      } else {
        console.log(`  ✗ ${enumName} - MISSING!`);
        enumsOk = false;
      }
    }

    // Check row counts
    console.log('\nChecking table row counts...');
    for (const tableName of expectedTables) {
      if (existingTableNames.includes(tableName)) {
        const result = await sql.unsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
        console.log(`  ${tableName}: ${result[0].count} rows`);
      }
    }

    // Summary
    console.log('\n--- Summary ---');
    if (tablesOk && enumsOk) {
      console.log('✓ All expected tables and enums exist!');
      console.log('✓ Database schema is ready to use.');

      if (tables.every(t => t.table_name)) {
        const totalTables = tables.length;
        const totalEnums = enums.length;
        console.log(`\nTotal: ${totalTables} tables, ${totalEnums} enum types`);
      }
    } else {
      console.log('✗ Schema is incomplete!');
      if (!tablesOk) {
        console.log('  Missing one or more tables.');
      }
      if (!enumsOk) {
        console.log('  Missing one or more enum types.');
      }
      console.log('\nRun: npm run db:init');
    }

  } catch (error) {
    console.error('Error verifying schema:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

verifySchema()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
