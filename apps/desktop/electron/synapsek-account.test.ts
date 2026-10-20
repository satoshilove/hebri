import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  accountJson,
  type AccountStorage,
  loadAccount,
  parseAccountConfig,
  saveAccount,
  SynapsekAccount,
  synapsekBrowserLogin
} from './synapsek-account'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) {fs.rmSync(dir, { recursive: true, force: true })}
})
const user = '11111111-1111-4111-8111-111111111111'
const client = '33333333-3333-4333-8333-333333333333'
const origin = 'https://synapsek.example'

const config = {
  version: 1 as const,
  clientId: client,
  issuer: 'https://staging.supabase.co/auth/v1',
  authorizeUrl: 'https://staging.supabase.co/auth/v1/oauth/authorize',
  tokenUrl: 'https://staging.supabase.co/auth/v1/oauth/token',
  redirectUri: 'http://127.0.0.1:49183/synapsek/callback',
  appOrigin: origin
}

const saved = {
  appOrigin: origin,
  issuer: config.issuer,
  clientId: client,
  userId: user,
  refreshToken: 'private-refresh'
}

const snapshot = (id = user) => ({
  version: 1,
  userId: id,
  email: 'test@example.com',
  billing: { plan: 'pro', sku: 'max', status: 'active', accessSource: 'stripe', includedMonthlyCredits: 8000 }
})

function fileStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hebri-account-'))
  dirs.push(dir)
  const file = path.join(dir, 'account.json')
  const key = randomBytes(32)

  const storage: AccountStorage = {
    available: () => true,
    encrypt: text => {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const value = Buffer.concat([cipher.update(text), cipher.final()])

      return Buffer.concat([iv, cipher.getAuthTag(), value])
    },
    decrypt: value => {
      const decipher = createDecipheriv('aes-256-gcm', key, value.subarray(0, 12))
      decipher.setAuthTag(value.subarray(12, 28))

      return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString()
    },
    read: () => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null),
    write: text => fs.writeFileSync(file, text, { mode: 0o600 }),
    clear: () => fs.rmSync(file, { force: true })
  }

  return { storage, file }
}

describe('Synapsek native account', () => {
  it('waits for the exact browser binding before persisting and revokes rejected sessions over real HTTP', async () => {
    for (const approve of [true, false]) {
      const { storage } = fileStore()
      let base = '', issuedChallenge = '', opened = false, reads = 0, revoked = false

      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url!, base)
        res.setHeader('Content-Type', 'application/json')

        if (url.searchParams.get('action') === 'config') {
          res.end(JSON.stringify({ ...config, appOrigin: base }))

          return
        }

        expect(req.headers.authorization).toBe('Bearer native-test-token')

        if (url.searchParams.get('action') === 'bind') {
          const chunks = []

          for await (const chunk of req) {chunks.push(chunk)}
          issuedChallenge = JSON.parse(Buffer.concat(chunks).toString()).challenge
          expect(issuedChallenge).toMatch(/^[a-f0-9]{64}$/)
          res.end(JSON.stringify({ expiresAt: new Date(Date.now() + 60000).toISOString() }))
        } else if (url.searchParams.get('action') === 'revoke') {
          revoked = true
          res.end(JSON.stringify({ revoked: true, refreshRevoked: true }))
        } else {
          expect(opened).toBe(true)
          expect(loadAccount(storage)).toBeNull()
          reads++

          if (approve && reads > 1) {res.end(JSON.stringify(snapshot()))}
          else {
            res.statusCode = approve ? 403 : 401
            res.end(JSON.stringify({ code: approve ? 'session_binding_required' : 'session_revoked' }))
          }
        }
      })

      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      base = `http://127.0.0.1:${(server.address() as { port: number }).port}`

      try {
        const account = new SynapsekAccount(base, storage, async url => {
          expect(url).toBe(`${base}/desktop/authorize#binding=${issuedChallenge}`)
          expect(url).not.toContain('native-test-token')
          opened = true
        }, accountJson, async () => ({
          accessToken: 'native-test-token', refreshToken: 'private-refresh', expiresAt: Date.now() + 3600000
        }))

        if (approve) {
          expect((await account.signIn()).state).toBe('signed_in')
          expect(reads).toBe(2)
          expect(loadAccount(storage)?.userId).toBe(user)
        } else {
          await expect(account.signIn()).rejects.toThrow('reauthentication_required')
          expect(loadAccount(storage)).toBeNull()
          expect(revoked).toBe(true)
        }
      } finally {
        server.closeAllConnections()
        await new Promise<void>(resolve => server.close(() => resolve()))
      }
    }
  })
  it('persists only protected refresh material and restores it after restart', () => {
    const { storage, file } = fileStore()
    saveAccount(saved, storage)
    expect(fs.readFileSync(file, 'utf8')).not.toContain(saved.refreshToken)
    expect(loadAccount(storage)).toEqual(saved)
  })
  it('rejects plaintext legacy blobs and unavailable encryption', () => {
    const { storage } = fileStore()
    storage.write(JSON.stringify({ encoding: 'plain', value: JSON.stringify(saved) }))
    expect(() => loadAccount(storage)).toThrow('stored_session_unavailable')
    storage.available = () => false
    expect(() => saveAccount(saved, storage)).toThrow('secure_storage_unavailable')
  })
  it('surfaces disk failures without claiming persistence', () => {
    const { storage } = fileStore()

    storage.write = () => {
      throw new Error('disk unavailable')
    }

    expect(() => saveAccount(saved, storage)).toThrow('disk unavailable')
  })
  it('does not accept changed issuer, callback or portal origins', () => {
    expect(parseAccountConfig(config, origin)).toEqual(config)
    expect(() => parseAccountConfig({ ...config, tokenUrl: 'https://evil.example' }, origin)).toThrow()
    expect(() =>
      parseAccountConfig({ ...config, redirectUri: 'http://0.0.0.0:49183/synapsek/callback' }, origin)
    ).toThrow()
    expect(() => parseAccountConfig(config, 'https://other.example')).toThrow()
  })
  it('serialises refresh, binds identity and never returns credentials to the UI', async () => {
    const { storage } = fileStore()
    saveAccount(saved, storage)
    let refreshes = 0

    const api = async (url: string) => {
      if (url.endsWith('action=config')) {return config}

      if (url === config.tokenUrl) {
        refreshes++

        return { token_type: 'Bearer', access_token: 'access', refresh_token: 'rotated', expires_in: 3600 }
      }

      return snapshot()
    }

    const account = new SynapsekAccount(origin, storage, async () => {}, api)
    const views = await Promise.all([account.status(), account.status()])
    expect(refreshes).toBe(1)
    expect(JSON.stringify(views)).not.toContain('rotated')
    expect(loadAccount(storage)?.refreshToken).toBe('rotated')

    const other = new SynapsekAccount(
      origin,
      storage,
      async () => {},
      async url =>
        url.endsWith('action=config')
          ? config
          : url === config.tokenUrl
            ? { token_type: 'Bearer', access_token: 'other', refresh_token: 'other-refresh', expires_in: 3600 }
            : snapshot('22222222-2222-4222-8222-222222222222')
    )

    await expect(other.status()).rejects.toThrow('account_mismatch')
  })
  it('persists logout, refuses silent account replacement, and supports A to B to A', async () => {
    const { storage } = fileStore()
    let id = user

    const account = new SynapsekAccount(
      origin,
      storage,
      async () => {},
      async url =>
        url.endsWith('action=config')
          ? config
          : url.endsWith('action=bind')
            ? { expiresAt: new Date(Date.now() + 60000).toISOString() }
          : url.endsWith('action=revoke')
            ? { revoked: true, refreshRevoked: true }
            : snapshot(id),
      async () => ({ accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 3600000 })
    )

    await account.signIn()
    await expect(account.signIn()).rejects.toThrow('sign_out_before_switching')
    await account.signOut()
    expect(loadAccount(storage)).toBeNull()
    id = '22222222-2222-4222-8222-222222222222'
    expect((await account.signIn()).account?.userId).toBe(id)
    await account.signOut()
    id = user
    expect((await account.signIn()).account?.userId).toBe(user)
  })
  it('runs a real loopback callback and redeems only the correct state with PKCE', async () => {
    const probe = http.createServer()
    await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve))
    const port = (probe.address() as { port: number }).port
    await new Promise<void>(resolve => probe.close(() => resolve()))
    const c = { ...config, redirectUri: `http://127.0.0.1:${port}/synapsek/callback` }
    let challenge = ''
    let exchanges = 0

    const tokens = await synapsekBrowserLogin(
      c,
      async url => {
        const authorize = new URL(url)
        challenge = authorize.searchParams.get('code_challenge')!
        const bad = await fetch(`${c.redirectUri}?code=wrong&state=wrong`)
        expect(bad.status).toBe(400)
        await fetch(`${c.redirectUri}?code=single-use&state=${authorize.searchParams.get('state')}`)
      },
      async (_url, init) => {
        exchanges++
        const form = new URLSearchParams(init?.body as string)
        expect(form.get('redirect_uri')).toBe(c.redirectUri)
        expect(createHash('sha256').update(form.get('code_verifier')!).digest('base64url')).toBe(challenge)

        return { token_type: 'Bearer', access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }
      },
      3000
    )

    expect(exchanges).toBe(1)
    expect(tokens.accessToken).toBe('access')
    await expect(fetch(c.redirectUri)).rejects.toThrow()
  })
  it('does not send existing credentials after the portal origin changes', async () => {
    const { storage } = fileStore()
    saveAccount(saved, storage)
    let calls = 0

    const account = new SynapsekAccount(
      'https://other.example',
      storage,
      async () => {},
      async () => {
        calls++

        return config
      }
    )

    await expect(account.status()).rejects.toThrow('reauthentication_required')
    await expect(account.signOut()).rejects.toThrow('reauthentication_required')
    expect(calls).toBe(0)
  })
  it('retries partial revocation without requiring the now-revoked account endpoint', async () => {
    const { storage } = fileStore()
    let revocations = 0

    const account = new SynapsekAccount(
      origin,
      storage,
      async () => {},
      async url => {
        if (url.endsWith('action=config')) {return config}

        if (url.endsWith('action=bind')) {return { expiresAt: new Date(Date.now() + 60000).toISOString() }}

        if (url.endsWith('action=revoke')) {return { revoked: true, refreshRevoked: ++revocations > 1 }}

        return snapshot()
      },
      async () => ({ accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 3600000 })
    )

    await account.signIn()
    await expect(account.signOut()).rejects.toThrow('revocation_incomplete')
    expect(loadAccount(storage)).not.toBeNull()
    expect(await account.signOut()).toEqual({ state: 'signed_out' })
    expect(loadAccount(storage)).toBeNull()
  })
  it('attempts server revocation when encrypted persistence fails after sign-in', async () => {
    const { storage } = fileStore()

    storage.write = () => {
      throw new Error('disk unavailable')
    }

    const calls: string[] = []

    const account = new SynapsekAccount(
      origin,
      storage,
      async () => {},
      async url => {
        calls.push(url)

        return url.endsWith('action=config')
          ? config
          : url.endsWith('action=bind')
            ? { expiresAt: new Date(Date.now() + 60000).toISOString() }
          : url.endsWith('action=revoke')
            ? { revoked: true, refreshRevoked: true }
            : snapshot()
      },
      async () => ({ accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 3600000 })
    )

    await expect(account.signIn()).rejects.toThrow('disk unavailable')
    expect(calls.at(-1)).toBe(`${origin}/api/desktop-account?action=revoke`)
    expect(loadAccount(storage)).toBeNull()
  })
  it('keeps local removal distinct from successful server revocation', async () => {
    const { storage } = fileStore()
    saveAccount(saved, storage)

    const account = new SynapsekAccount(
      origin,
      storage,
      async () => {},
      async () => {
        throw new Error('offline')
      }
    )

    await expect(account.signOut()).rejects.toThrow('offline')
    expect(loadAccount(storage)).not.toBeNull()
    expect(await account.forgetLocal()).toEqual({ state: 'signed_out' })
    expect(loadAccount(storage)).toBeNull()
  })
})
