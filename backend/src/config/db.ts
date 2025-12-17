import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './env';
import * as schema from '../db/schema';
import { logger } from '../utils/logger';

// Lazy-initialize the database connection to allow server to start quickly
// This helps pass Railway healthchecks even if the database is slow to connect
let client: ReturnType<typeof postgres> | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient() {
  if (!client) {
    logger.info('Initializing database connection...');
    client = postgres(config.database.url, {
      prepare: false,
      connect_timeout: 60,  // 60 seconds to allow for Neon cold start wake-up
      idle_timeout: 20,     // Close idle connections after 20 seconds
      max_lifetime: 60 * 30, // Max connection lifetime of 30 minutes
    });
  }
  return client;
}

function getDb() {
  if (!drizzleDb) {
    drizzleDb = drizzle(getClient(), { schema });
  }
  return drizzleDb;
}

// Export a proxy that lazily initializes the database on first access
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    return typeof value === 'function' ? value.bind(realDb) : value;
  }
});

export type DB = typeof db;
