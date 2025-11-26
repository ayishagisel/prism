import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './env';
import * as schema from '../db/schema';

// Create the postgres client
const client = postgres(config.database.url, {
  prepare: false,
});

// Wrap with Drizzle ORM
export const db = drizzle(client, { schema });

export type DB = typeof db;
