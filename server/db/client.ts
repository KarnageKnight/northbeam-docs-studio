import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required for database access.')

export const pool = new pg.Pool({ connectionString })
export const db = drizzle({ client: pool, schema })
