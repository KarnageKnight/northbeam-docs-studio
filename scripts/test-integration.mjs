import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const project = 'northbeam-docs-studio-test'
const lock = join(tmpdir(), `${project}.lock`)
const compose = ['compose', '-f', join(root, 'compose.yaml'), '-p', project, '--profile', 'test']
let foreground
let interrupted = 0
let cleaning = false

for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.on(signal, () => {
    interrupted = code
    if (!cleaning) foreground?.kill('SIGTERM')
  })
}

async function run(command, args, { capture = false, cleanup = false } = {}) {
  if (interrupted && !cleanup) throw Object.assign(new Error('Test run interrupted.'), { exitCode: interrupted })
  const child = spawn(command, args, {
    cwd: root,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })
  foreground = child
  let output = ''
  child.stdout?.on('data', (data) => { output += data })
  try {
    const [code, signal] = await once(child, 'exit')
    if (code !== 0) {
      throw Object.assign(new Error(`${command} exited with ${code ?? signal}.`), {
        exitCode: interrupted || code || 1,
      })
    }
    return output.trim()
  }
  finally {
    foreground = undefined
  }
}

async function runInsideContainer() {
  const target = new URL(process.env.DATABASE_URL ?? '')
  if (target.hostname !== 'test-db' || target.pathname !== '/northbeam_test') {
    throw new Error('The test runner requires the dedicated test database.')
  }
  await run(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--project', 'integration'])
}

async function runOnHost() {
  try {
    await mkdir(lock)
  }
  catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Integration run already owns ${lock}. Check its owner.json; do not remove an active run's lock.`)
    }
    throw error
  }

  let resourcesOwned = false
  let result = 0
  try {
    await writeFile(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, root, startedAt: new Date().toISOString() }))
    const running = await run('docker', [...compose, 'ps', '-q', '--status', 'running', 'test-runner'], { capture: true })
    if (running) throw new Error('A test-runner container is already active; its resources were left untouched.')
    resourcesOwned = true
    await run('docker', [...compose, 'down', '--volumes', '--remove-orphans'])
    await run('docker', [...compose, 'build', 'test-runner'])
    await run('docker', [...compose, 'up', '-d', '--wait', 'test-db'])
    await run('docker', [...compose, 'run', '--rm', '--no-deps', 'test-runner'])
  }
  catch (error) {
    console.error(error.message)
    result = interrupted || error.exitCode || 1
  }
  finally {
    cleaning = true
    if (resourcesOwned) {
      try { await run('docker', [...compose, 'down', '--volumes', '--remove-orphans'], { cleanup: true }) }
      catch (error) {
        console.error(`Test cleanup failed: ${error.message}`)
        result ||= 1
      }
    }
    try { await rm(lock, { recursive: true }) }
    catch (error) {
      console.error(`Lock cleanup failed: ${error.message}`)
      result ||= 1
    }
  }
  process.exitCode = interrupted || result
}

try {
  if (process.argv.includes('--inside')) await runInsideContainer()
  else await runOnHost()
}
catch (error) {
  console.error(error.message)
  process.exitCode = interrupted || error.exitCode || 1
}
