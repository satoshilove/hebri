import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { createRequire as createNativeRequire } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'

import { writeSecretFileAtomic } from './hardening'

const exec = promisify(execFile)
// Electron's fs treats .asar files as directories. Backups must copy their bytes.
const diskFs: typeof fs = process.versions.electron ? createNativeRequire(import.meta.url)('original-fs').promises : fs

/** An OS lock survives neither a crashed desktop (pipe EOF) nor a crashed helper. */
export async function withBundledRuntimeLock<T>(activeRoot: string, python: string, run: () => Promise<T>): Promise<T> {
  // Use the base interpreter, not the venv being updated, and import only stdlib.
  const { stdout } = await exec(python, ['-c', 'import sys; print(sys._base_executable)'], { windowsHide: true, timeout: 15000 })

  const script = `import os,sys
f=open(sys.argv[1], 'a+b')
f.write(b'0'); f.flush(); f.seek(0)
try:
 if os.name == 'nt':
  import msvcrt
  msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
 else:
  import fcntl
  fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
except OSError:
 sys.exit(2)
print('locked', flush=True)
sys.stdin.buffer.read()
`

  const child = spawn(stdout.trim(), ['-c', script, path.join(path.dirname(activeRoot), 'desktop-runtime-refresh.lock')], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  const closed = new Promise<void>(resolve => child.once('close', () => resolve()))

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Could not reserve the Hebri backend update. Restart Hebri and retry.')), 15000)

      const fail = () => { clearTimeout(timer); reject(new Error('Another Hebri backend update is running. Wait for it to finish, then retry.')) }
      child.once('error', fail)
      child.once('close', fail)
      child.stdout.once('data', data => {
        clearTimeout(timer)

        if (String(data).trim() === 'locked') { resolve() } else { fail() }
      })
    })

    return await run()
  } finally {
    child.stdin.end()
    await closed
  }
}

interface RefreshOptions {
  packaged: boolean
  sourceRoot: string | null
  activeRoot: string
  desktopVersion: string
  marker: { schemaVersion?: unknown; desktopVersion?: unknown } | null
  gitBinary: string
}

function releaseNumber(value: unknown): number[] | null {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) {return null}

  return value.split('.').map(Number)
}

/** Only upgrade a desktop-owned bundle. CLI/developer checkouts retain ownership. */
export async function needsBundledRuntimeRefresh(options: RefreshOptions): Promise<boolean> {
  if (!options.packaged || !options.sourceRoot) {return false}
  let pending: { desktopVersion?: unknown } | null = null

  try {
    pending = JSON.parse(await fs.readFile(pendingPath(options.activeRoot), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {throw error}
  }

  const installed = releaseNumber(options.marker?.desktopVersion)
  const current = releaseNumber(options.desktopVersion)

  if (!current) {return false}

  if (!pending && (options.marker?.schemaVersion !== 1 || !installed)) {
    return false
  }

  const previous = pending ? releaseNumber(pending.desktopVersion) : installed

  if (!previous) {throw new Error('Hebri backend update record is invalid. Use Repair install.')}
  const difference = current.findIndex((part, index) => part !== previous[index])

  if ((difference < 0 && !pending) || (difference >= 0 && current[difference] < previous[difference])) {return false}

  await fs.access(path.join(options.sourceRoot, 'pyproject.toml'))

  // Never inherit a parent repository's remotes from an interrupted install.
  try {
    await fs.lstat(path.join(options.activeRoot, '.git'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {throw error}

    if (pending) {throw new Error('The Hebri backend update was interrupted before its checkout was ready. Use Repair install.')}

    return false
  }

  const { stdout } = await exec(options.gitBinary, ['remote'], {
    cwd: options.activeRoot,
    windowsHide: true,
    timeout: 15000
  })

  return stdout.trim() === ''
}

function pendingPath(activeRoot: string) {
  return path.join(path.dirname(activeRoot), 'desktop-runtime-refresh.json')
}

export function beginBundledRuntimeRefresh(activeRoot: string, desktopVersion: string, backup: string) {
  writeSecretFileAtomic(pendingPath(activeRoot), JSON.stringify({ desktopVersion, backup }), { encoding: 'utf8' })
}

export async function finishBundledRuntimeRefresh(activeRoot: string) {
  await fs.rm(pendingPath(activeRoot), { force: true })
}

export async function assertBundledRuntimeIdle(activeRoot: string, python: string) {
  // The shared ledger validates PID + creation time and scopes entries to the
  // exact install. Never stop someone else's backend or infer ownership from text.
  const { stdout } = await exec(
    python,
    [
      '-c',
      'import json,os; from pathlib import Path; from hermes_cli.process_identity import ledger_entries; print(json.dumps([e["pid"] for e in ledger_entries(project_root=Path.cwd()) if e["pid"] != os.getpid()]))'
    ],
    {
      cwd: activeRoot,
      env: { ...process.env, HERMES_HOME: path.dirname(activeRoot), PYTHONPATH: activeRoot },
      windowsHide: true,
      timeout: 15000
    }
  )

  const pids: unknown = JSON.parse(stdout)

  if (!Array.isArray(pids)) {throw new Error('Could not verify that the Hebri backend is idle. Restart Hebri and retry.')}

  if (pids.length)
    {throw new Error(
      'Close other Hebri windows, terminals and messaging gateways using this installation, then retry the backend update. Their work has not been stopped.'
    )}
}

// These are preserved by the bundle installer, not source files it replaces.
const PRESERVED = new Set(['.git', 'venv', '.venv', '.hermes-runtime', 'node_modules', 'bin', '.npm-cache'])

/** Preserve local source edits and untracked files before the existing installer refreshes them. */
export async function backupBundledRuntime(activeRoot: string): Promise<string> {
  const root = await fs.realpath(activeRoot)
  const backup = await fs.mkdtemp(path.join(path.dirname(root), 'hebri-source-backup-'))
  await diskFs.cp(root, backup, {
    recursive: true,
    verbatimSymlinks: true,
    filter: source => {
      const relative = path.relative(root, source)
      const parts = relative.split(path.sep)

      return !PRESERVED.has(parts[0]) && !parts.includes('__pycache__') && !parts.includes('.pytest_cache')
    }
  })

  return backup
}
