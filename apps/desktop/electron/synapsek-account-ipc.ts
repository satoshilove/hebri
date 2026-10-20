import { BrowserWindow, ipcMain } from 'electron'

import { AccountError } from './synapsek-account'
import { getSynapsekAccount } from './synapsek-account-runtime'

export function registerSynapsekAccountIpc(rendererUrl: () => string) {
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

      if (!['status', 'signIn', 'signOut', 'openBilling', 'forgetLocal'].includes(String(operation))) {
        throw new AccountError('invalid_operation')
      }

      const account = getSynapsekAccount()

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
