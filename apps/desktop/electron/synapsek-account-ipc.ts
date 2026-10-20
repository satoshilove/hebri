import fs from 'node:fs'
import path from 'node:path'

import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron'

import { writeSecretFileAtomic } from './hardening'
import { resolvePortalBaseUrl } from './portal-origin'
import { AccountError, type AccountStorage, SynapsekAccount } from './synapsek-account'

export function registerSynapsekAccountIpc(rendererUrl: () => string) {
  let account: SynapsekAccount | undefined
  ipcMain.handle('hebri:synapsek-account', async (event, operation: unknown) => {
    try {
      const frame = event.senderFrame

      if (!frame || frame !== event.sender.mainFrame || !BrowserWindow.fromWebContents(event.sender)) {
        throw new AccountError('forbidden')
      }

      const actual = new URL(frame.url)
      const expected = new URL(rendererUrl())

      if (
        actual.protocol !== expected.protocol ||
        actual.host !== expected.host ||
        actual.pathname !== expected.pathname
      ) {
        throw new AccountError('forbidden')
      }

      if (!['status', 'signIn', 'signOut', 'openBilling', 'forgetLocal'].includes(String(operation)))
        {throw new AccountError('invalid_operation')}

      if (!account) {
        const file = path.join(app.getPath('userData'), 'synapsek-account-v1.enc.json')

        const storage: AccountStorage = {
          available: () =>
            safeStorage.isEncryptionAvailable() &&
            (process.platform !== 'linux' ||
              !['basic_text', 'unknown', undefined].includes(safeStorage.getSelectedStorageBackend?.())),
          encrypt: value => safeStorage.encryptString(value),
          decrypt: value => safeStorage.decryptString(value),
          read: () => {
            try {
              return fs.readFileSync(file, 'utf8')
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === 'ENOENT') {return null}
              throw error
            }
          },
          write: value => writeSecretFileAtomic(file, value, { encoding: 'utf8' }),
          clear: () => {
            fs.rmSync(file, { force: true })
          }
        }

        account = new SynapsekAccount(new URL(resolvePortalBaseUrl()).origin, storage, url => shell.openExternal(url))
      }

      const result =
        operation === 'status'
          ? await account.status()
          : operation === 'signIn'
            ? await account.signIn()
            : operation === 'signOut'
              ? await account.signOut()
              : operation === 'forgetLocal'
                ? await account.forgetLocal()
                : await account.openBilling()

      return { ok: true, value: result ?? null }
    } catch (error) {
      // Never serialise network bodies, credentials, disk contents or raw errors.
      return { ok: false, code: error instanceof AccountError ? error.code : 'account_operation_failed' }
    }
  })
}
