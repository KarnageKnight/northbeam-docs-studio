import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
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

let server: ChildProcess | undefined

export async function startApp() {
  server = spawn(process.execPath, ['.output/server/index.mjs'], {
    env: { ...process.env, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '3000' },
    stdio: 'inherit',
  })
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) throw new Error('Application exited before readiness.')
    try {
      const response = await fetch(appUrl, { signal: AbortSignal.timeout(1000) })
      if (response.ok && (await response.text()).includes('Northbeam Docs Studio')) return
    }
    catch { /* Retry until the production server is ready. */ }
    await delay(200)
  }
  throw new Error('Application did not become ready within 30 seconds.')
}

export async function stopApp(signal: NodeJS.Signals = 'SIGTERM') {
  if (!server || server.exitCode !== null || server.signalCode !== null) return
  const exited = once(server, 'exit')
  server.kill(signal)
  const timeout = setTimeout(() => server?.kill('SIGKILL'), 5000)
  try { await exited }
  finally { clearTimeout(timeout) }
}

export async function restartApp() {
  await stopApp()
  await startApp()
}

export async function waitForBlockedQuery(blockerPid: number) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    const { rows } = await pool.query('SELECT pid FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))', [blockerPid])
    if (rows[0]) return rows[0].pid as number
    await delay(20)
  }
  throw new Error('No database operation reached the lock barrier.')
}

export async function runContendingRequests(
  articleId: string,
  first: () => Promise<Response>,
  second: () => Promise<Response>,
) {
  const controller = await pool.connect()
  const requests: Promise<Response>[] = []
  try {
    await controller.query('BEGIN')
    await controller.query('SELECT id FROM articles WHERE id=$1 FOR UPDATE', [articleId])
    const { rows: [{ pid }] } = await controller.query('SELECT pg_backend_pid() AS pid')
    requests.push(first())
    const firstPid = await waitForBlockedQuery(pid)
    requests.push(second())
    // Observe the second transaction behind the first before releasing their shared row.
    const secondPid = await waitForBlockedQuery(firstPid)
    if (new Set([pid, firstPid, secondPid]).size !== 3) throw new Error('Contenders must use independent database connections.')
    await controller.query('ROLLBACK')
    return await Promise.all(requests)
  }
  finally {
    try {
      await controller.query('ROLLBACK')
      await Promise.allSettled(requests)
    }
    finally { controller.release() }
  }
}
