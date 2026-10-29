import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, expect, test } from 'vitest'

import {
  backupBundledRuntime,
  beginBundledRuntimeRefresh,
  finishBundledRuntimeRefresh,
  needsBundledRuntimeRefresh,
  withBundledRuntimeLock
} from './bundled-runtime-refresh'

const homes: string[] = []

function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hebri-refresh-'))
  homes.push(home)
  const activeRoot = path.join(home, 'hebri-agent')
  const sourceRoot = path.join(home, 'bundle')
  fs.mkdirSync(activeRoot)
  fs.mkdirSync(sourceRoot)
  fs.writeFileSync(path.join(sourceRoot, 'pyproject.toml'), '[project]\nname="fixture"\n')
  execFileSync('git', ['init', '-q', activeRoot])

  return {
    packaged: true,
    activeRoot,
    sourceRoot,
    gitBinary: 'git',
    desktopVersion: '0.17.24',
    marker: { schemaVersion: 1, desktopVersion: '0.17.16' }
  }
}

afterEach(() => {
  for (const home of homes.splice(0)) {fs.rmSync(home, { recursive: true, force: true })}
})

test('refreshes an old desktop-owned bundle, never a CLI checkout or a newer release', async () => {
  const options = fixture()
  expect(await needsBundledRuntimeRefresh(options)).toBe(true)
  expect(await needsBundledRuntimeRefresh({ ...options, packaged: false })).toBe(false)
  expect(await needsBundledRuntimeRefresh({ ...options, marker: null })).toBe(false)
  expect(await needsBundledRuntimeRefresh({ ...options, desktopVersion: '0.17.15' })).toBe(false)
  expect(await needsBundledRuntimeRefresh({ ...options, desktopVersion: '0.17.16' })).toBe(false)
  execFileSync('git', ['remote', 'add', 'origin', 'https://example.invalid/owned.git'], { cwd: options.activeRoot })
  expect(await needsBundledRuntimeRefresh(options)).toBe(false)
})

test('backs up edited and untracked source without copying the preserved venv or user profile', async () => {
  const options = fixture()
  fs.writeFileSync(path.join(options.activeRoot, 'edited.py'), '# local edit')
  fs.writeFileSync(path.join(options.activeRoot, 'notes.txt'), 'untracked work')
  fs.mkdirSync(path.join(options.activeRoot, 'venv'))
  fs.writeFileSync(path.join(options.activeRoot, 'venv', 'keep'), 'runtime')
  const userConfig = path.join(path.dirname(options.activeRoot), 'config.yaml')
  fs.writeFileSync(userConfig, 'keep: unchanged')
  const backup = await backupBundledRuntime(options.activeRoot)
  expect(fs.readFileSync(path.join(backup, 'edited.py'), 'utf8')).toBe('# local edit')
  expect(fs.readFileSync(path.join(backup, 'notes.txt'), 'utf8')).toBe('untracked work')
  expect(fs.existsSync(path.join(backup, 'venv'))).toBe(false)
  expect(fs.readFileSync(userConfig, 'utf8')).toBe('keep: unchanged')
  beginBundledRuntimeRefresh(options.activeRoot, options.desktopVersion, backup)
  // An interrupted repository stage can remove the old bootstrap marker.
  expect(await needsBundledRuntimeRefresh({ ...options, marker: null })).toBe(true)
  await finishBundledRuntimeRefresh(options.activeRoot)
  expect(
    await needsBundledRuntimeRefresh({
      ...options,
      marker: { schemaVersion: 1, desktopVersion: options.desktopVersion }
    })
  ).toBe(false)
})

test('excludes a concurrent installer and releases the OS lock after failure', async () => {
  const options = fixture()
  const python = process.env.HEBRI_TEST_PYTHON || 'python'
  await expect(withBundledRuntimeLock(options.activeRoot, python, async () => {
    await expect(withBundledRuntimeLock(options.activeRoot, python, async () => 'unsafe')).rejects.toThrow('Another Hebri')
    throw new Error('installer failed')
  })).rejects.toThrow('installer failed')
  await expect(withBundledRuntimeLock(options.activeRoot, python, async () => 'retry')).resolves.toBe('retry')
}, 30000)

test('does not inherit parent Git metadata when an interrupted checkout is missing', async () => {
  const options = fixture()
  fs.rmSync(path.join(options.activeRoot, '.git'), { recursive: true, force: true })
  expect(await needsBundledRuntimeRefresh(options)).toBe(false)
  beginBundledRuntimeRefresh(options.activeRoot, options.desktopVersion, 'fixture-backup')
  await expect(needsBundledRuntimeRefresh(options)).rejects.toThrow('Use Repair install')
})
