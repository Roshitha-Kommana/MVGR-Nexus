import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL environment variable is missing.");
}

const pool = new pg.Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });
