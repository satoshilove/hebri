import fs from 'node:fs'
import path from 'node:path'

import { app, safeStorage, shell } from 'electron'

import { writeSecretFileAtomic } from './hardening'
import { resolvePortalBaseUrl } from './portal-origin'
import { type AccountStorage, SynapsekAccount } from './synapsek-account'
import { startSynapsekInferenceBridge } from './synapsek-inference-bridge'

let account: SynapsekAccount | undefined
let bridge: ReturnType<typeof startSynapsekInferenceBridge> | undefined

export function getSynapsekAccount() {
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
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return null
          }

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

  return account!
}

export async function synapsekBackendEnvironment() {
  try {
    bridge ??= startSynapsekInferenceBridge(getSynapsekAccount()).catch(error => {
      bridge = undefined
      throw error
    })

    return (await bridge).env
  } catch {
    // Fail closed for this provider without preventing unrelated BYOK/local use.
    return { HEBRI_SYNAPSEK_BRIDGE_URL: '', HEBRI_SYNAPSEK_BRIDGE_TOKEN: '' }
  }
}
