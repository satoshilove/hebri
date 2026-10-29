import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

// Launch the packaged Windows candidate without borrowing the real user's
// sessions, credentials or browser profile. Installation remains a VM test.
const desktop = path.resolve(import.meta.dirname, '..')
const repo = path.resolve(desktop, '../..')
const binary = path.join(desktop, 'release/win-unpacked/Hebri.exe')
if (process.platform !== 'win32' || !fs.existsSync(binary)) {
  throw new Error('Build the Windows candidate first: npm run dist:win -- --publish never')
}
const python = process.env.HERMES_DESKTOP_PYTHON || ['.venv', 'venv']
  .map(dir => path.join(repo, dir, 'Scripts/python.exe')).find(file => fs.existsSync(file))
if (!python || !fs.existsSync(python)) {
  throw new Error('Set HERMES_DESKTOP_PYTHON to a prepared Hebri Python runtime, or create the repository venv first.')
}
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hebri-local-preview-'))
const env = {}
for (const key of ['SystemRoot', 'WINDIR', 'COMSPEC', 'PATH', 'PATHEXT', 'TEMP', 'TMP']) {
  if (process.env[key]) env[key] = process.env[key]
}
for (const key of ['APPDATA', 'LOCALAPPDATA', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME']) {
  env[key] = path.join(root, key.toLowerCase())
  fs.mkdirSync(env[key], { recursive: true })
}
Object.assign(env, {
  HOME: root,
  USERPROFILE: root,
  HEBRI_HOME: path.join(root, 'hebri'),
  HERMES_HOME: path.join(root, 'hebri'),
  HERMES_DESKTOP_USER_DATA_DIR: path.join(root, 'desktop'),
  HERMES_DESKTOP_ISOLATED_BACKEND: '1',
  HERMES_DESKTOP_IGNORE_EXISTING: '1',
  HERMES_DESKTOP_HERMES_ROOT: path.join(desktop, 'release/win-unpacked/resources/hebri-source'),
  HERMES_DESKTOP_PYTHON: python,
  HERMES_DESKTOP_APP_NAME: 'Hebri Local Preview'
})
fs.mkdirSync(env.HEBRI_HOME, { recursive: true })
fs.mkdirSync(env.HERMES_DESKTOP_USER_DATA_DIR, { recursive: true })
console.log(`Starting local candidate. Disposable test data: ${root}`)
console.log('The installed Hebri profile is not used. Close the preview when finished.')
const child = spawn(binary, [], { cwd: root, env, stdio: 'inherit' })
child.on('error', error => { console.error(error); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
