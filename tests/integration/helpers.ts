import { pool } from '../../server/db/client'

const target = new URL(process.env.DATABASE_URL ?? '')
if (target.hostname !== 'test-db' || target.pathname !== '/northbeam_test') {
  throw new Error('Integration tests require the dedicated test-db/northbeam_test database.')
}

export { pool }
export const appUrl = 'http://127.0.0.1:3000'

export async function resetDatabase() {
  await pool.query('TRUNCATE TABLE articles, article_versions')
}
