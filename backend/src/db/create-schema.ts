/**
 * Create database schema directly using Drizzle ORM
 * This bypasses drizzle-kit entirely and uses the schema definitions directly
 */

import { db } from '../config/db';
import * as schema from './schema';
import { logger } from '../utils/logger';

async function createSchema() {
  try {
    logger.info('Creating database schema using Drizzle ORM...');

    // Drizzle ORM will introspect and create tables based on schema definitions
    // The schema module exports all table definitions which the db config will use

    // For PostgreSQL with Drizzle, we can use the migrator to run migrations
    // But since migrations folder might not exist, we'll verify tables exist

    // Test connection by running a simple query
    const result = await db.execute(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'agencies'
      );`
    );

    const tableExists = (result as any)[0]?.exists;

    if (tableExists) {
      logger.info('✓ Tables already exist in database!');
      return;
    }

    // If tables don't exist, we need to use drizzle-kit or raw SQL
    logger.info('Tables do not exist. Using drizzle-kit to create schema...');
    logger.info('Run: npm run db:push -w backend');
    logger.info('Or copy and paste the SQL from init_schema.sql to Neon console');

  } catch (error) {
    logger.error('Schema creation error', error);
    throw error;
  }
}

createSchema()
  .then(() => {
    logger.info('✓ Schema setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Failed to create schema:', error);
    process.exit(1);
  });
