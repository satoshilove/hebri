import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { test, vi } from 'vitest'

import { createReleaseUpdater, releaseUpdaterEnabled, routeDesktopUpdate } from './release-updater'

function updater(result: object | null = null) {
  const events = new EventEmitter()

  return {
    on: events.on.bind(events),
    emit: events.emit.bind(events),
    allowPrerelease: true,
    autoDownload: true,
    allowDowngrade: true,
    setFeedURL: vi.fn(),
    downloadUpdate: vi.fn(async () => ['verified-installer']),
    autoInstallOnAppQuit: false,
    checkForUpdates: vi.fn(async () => result),
    disableWebInstaller: false,
    logger: null
  }
}

test('release updates are packaged-only so source installs keep the branch updater', () => {
  assert.equal(releaseUpdaterEnabled(false), false)
  assert.equal(releaseUpdaterEnabled(true), true)
})

test('packaged updates fail closed to stable, complete artifacts', () => {
  const client = updater()

  const controller = createReleaseUpdater({
    currentVersion: '0.17.16',
    getWindow: () => null,
    isPackaged: true,
    log: vi.fn(),
    showMessageBox: vi.fn(),
    updater: client as never
  })

  assert.ok(controller)
  assert.equal(client.autoDownload, false)
  assert.equal(client.allowDowngrade, false)
  assert.deepEqual(client.setFeedURL.mock.calls[0], [
    { provider: 'github', owner: 'satoshilove', repo: 'hebri', private: false, releaseType: 'release' }
  ])
  assert.equal(client.autoInstallOnAppQuit, true)
  assert.equal(client.allowPrerelease, false)
  assert.equal(client.disableWebInstaller, true)
  assert.ok(client.logger)
})

test('manual checks distinguish current, available, and failed releases', async () => {
  const showMessageBox = vi.fn(async (_window: unknown, _options: { message: string; title?: string }) => ({
    checkboxChecked: false,
    response: 0
  }))

  const log = vi.fn()
  const current = updater({ isUpdateAvailable: false, updateInfo: { version: '0.17.12' } })

  const currentController = createReleaseUpdater({
    currentVersion: '0.17.16',
    getWindow: () => null,
    isPackaged: true,
    log,
    showMessageBox,
    updater: current as never
  })

  await currentController?.check(true)
  assert.equal(showMessageBox.mock.calls.at(-1)?.[1].title, 'Hebri is up to date')

  const available = updater({ isUpdateAvailable: true, updateInfo: { version: '0.17.13' } })

  const availableController = createReleaseUpdater({
    currentVersion: '0.17.16',
    getWindow: () => null,
    isPackaged: true,
    log,
    showMessageBox,
    updater: available as never
  })

  await availableController?.check(true)
  assert.equal(showMessageBox.mock.calls.at(-1)?.[1].title, 'Hebri update found')
  assert.match(showMessageBox.mock.calls.at(-1)?.[1].message ?? '', /0\.17\.13/)

  const failed = updater()
  failed.checkForUpdates.mockRejectedValueOnce(new Error('offline'))

  const failedController = createReleaseUpdater({
    currentVersion: '0.17.16',
    getWindow: () => null,
    isPackaged: true,
    log,
    showMessageBox,
    updater: failed as never
  })

  await failedController?.check(true)
  assert.equal(showMessageBox.mock.calls.at(-1)?.[1].title, 'Could not check for updates')
  assert.match(String(log.mock.calls.at(-1)?.[0]), /offline/)
})

test('packaged checks and apply use releases even without origin; failures never reach source Git', async () => {
  const source = vi.fn(async () => {
    throw new Error("fatal: 'origin' does not appear to be a git repository")
  })

  const client = updater({ isUpdateAvailable: true, updateInfo: { version: '0.17.17' } })

  const controller = createReleaseUpdater({
    currentVersion: '0.17.16',
    isPackaged: true,
    getWindow: () => null,
    log: vi.fn(),
    showMessageBox: vi.fn(),
    updater: client as never
  })!

  const status = await routeDesktopUpdate(true, () => controller.status(), source)
  assert.equal(status.releaseVersion, '0.17.17')
  assert.equal(status.updateAvailable, true)
  assert.equal(client.downloadUpdate.mock.calls.length, 0)
  const result = await routeDesktopUpdate(true, () => controller.apply(), source)
  assert.equal(result.manualRestart, true)
  assert.equal(client.downloadUpdate.mock.calls.length, 1)
  assert.equal((await controller.apply()).ok, true)
  assert.equal(client.downloadUpdate.mock.calls.length, 1)
  await assert.rejects(routeDesktopUpdate(true, undefined, source), /not ready/)
  assert.equal(source.mock.calls.length, 0)
  await assert.rejects(routeDesktopUpdate(false, undefined, source), /origin/)
  assert.equal(source.mock.calls.length, 1)
})

test('a disabled updater is an error, and concurrent checks share a request', async () => {
  const client = updater(null)

  const controller = createReleaseUpdater({
    currentVersion: '0.17.16',
    isPackaged: true,
    getWindow: () => null,
    log: vi.fn(),
    showMessageBox: vi.fn(),
    updater: client as never
  })!

  const [first, second] = await Promise.all([controller.status(true), controller.status(true)])
  assert.equal(first.error, 'check-failed')
  assert.deepEqual(first, second)
  assert.equal(client.checkForUpdates.mock.calls.length, 1)
  assert.equal((await controller.apply()).ok, false)
  assert.equal(client.downloadUpdate.mock.calls.length, 0)
})

test('release download streams real progress, survives a reopened status view and becomes ready only after verification', async () => {
  const client = updater({ isUpdateAvailable: true, updateInfo: { version: '0.17.21' } })
  let finish!: (files: string[]) => void
  client.downloadUpdate.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve
      })
  )
  const onProgress = vi.fn()

  const controller = createReleaseUpdater({
    currentVersion: '0.17.20',
    isPackaged: true,
    getWindow: () => null,
    log: vi.fn(),
    showMessageBox: vi.fn(),
    updater: client as never,
    onProgress
  })!

  const first = controller.apply()
  const second = controller.apply()
  await vi.waitFor(() => assert.equal(client.downloadUpdate.mock.calls.length, 1))
  client.emit('download-progress', { transferred: 50, total: 100, bytesPerSecond: 10 })
  assert.equal(onProgress.mock.calls.at(-1)?.[0].percent, 50)
  assert.equal((await controller.status()).progress?.transferred, 50)
  client.emit('download-progress', { transferred: 100, total: 100, bytesPerSecond: 10 })
  assert.equal((await controller.status()).progress?.releasePhase, 'verifying')
  finish(['verified-installer'])
  const [one, two] = await Promise.all([first, second])
  assert.deepEqual(one, two)
  assert.equal(one.releaseVersion, '0.17.21')
  assert.equal(one.manualRestart, true)
  assert.equal((await controller.status()).progress?.releasePhase, 'ready')
  await controller.apply()
  assert.equal(client.downloadUpdate.mock.calls.length, 1)
})

test('failed verification never reports ready and a retry starts with unknown progress', async () => {
  const client = updater({ isUpdateAvailable: true, updateInfo: { version: '0.17.21' } })

  const controller = createReleaseUpdater({
    currentVersion: '0.17.20',
    isPackaged: true,
    getWindow: () => null,
    log: vi.fn(),
    showMessageBox: vi.fn(),
    updater: client as never
  })!

  client.downloadUpdate.mockImplementationOnce(async () => {
    client.emit('download-progress', { transferred: 100, total: 100, bytesPerSecond: 10 })
    client.emit('error', new Error('checksum mismatch'))
    throw new Error('checksum mismatch')
  })
  assert.equal((await controller.apply()).ok, false)
  assert.equal((await controller.status()).progress?.stage, 'error')
  assert.equal((await controller.status()).progress?.releasePhase, undefined)
  assert.equal((await controller.apply()).ok, true)
})
