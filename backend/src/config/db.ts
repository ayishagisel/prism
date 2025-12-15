import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './env';
import * as schema from '../db/schema';

// Create the postgres client with Neon-optimized settings
// Neon serverless suspends after 5 min of inactivity; these settings handle cold starts
const client = postgres(config.database.url, {
  prepare: false,
  connect_timeout: 60,  // 60 seconds to allow for Neon cold start wake-up
  idle_timeout: 20,     // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // Max connection lifetime of 30 minutes
});

// Wrap with Drizzle ORM
export const db = drizzle(client, { schema });

export type DB = typeof db;
