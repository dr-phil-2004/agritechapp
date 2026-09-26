import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || '';

const client = postgres(connectionString, {
  ssl: 'require',
  max: 1, // Vercel serverless: une connexion par fonction
});
export const db = drizzle(client);
