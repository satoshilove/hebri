import { randomBytes } from 'node:crypto'
import http from 'node:http'

import { generatePkcePair, generateState } from './native-oauth'
import type { AccountSnapshot, SynapsekAccountView } from './synapsek-account-types'
import { managedInferenceJson } from './synapsek-inference-bridge'

export interface AccountConfig {
  version: 1
  clientId: string
  issuer: string
  authorizeUrl: string
  tokenUrl: string
  redirectUri: string
  appOrigin: string
}
export interface AccountStorage {
  read(): string | null
  write(text: string): void
  clear(): void
  available(): boolean
  encrypt(text: string): Buffer
  decrypt(value: Buffer): string
}
interface SavedAccount {
  appOrigin: string
  issuer: string
  clientId: string
  userId: string
  refreshToken: string
}
interface Tokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export class AccountError extends Error {
  constructor(public readonly code: string) {
    super(code)
  }
}

export function saveAccount(saved: SavedAccount, storage: AccountStorage) {
  if (!storage.available()) {
    throw new AccountError('secure_storage_unavailable')
  }

  const encrypted = storage.encrypt(JSON.stringify(saved))

  if (!encrypted.length) {
    throw new AccountError('secure_storage_unavailable')
  }

  storage.write(JSON.stringify({ version: 1, encoding: 'os-protected', value: encrypted.toString('base64') }))
}

export function loadAccount(storage: AccountStorage): SavedAccount | null {
  const text = storage.read()

  if (text === null) {
    return null
  }

  if (!storage.available()) {
    throw new AccountError('secure_storage_unavailable')
  }

  try {
    const blob = JSON.parse(text)

    if (
      blob.version !== 1 ||
      blob.encoding !== 'os-protected' ||
      typeof blob.value !== 'string' ||
      blob.value.length > 64_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(blob.value)
    ) {
      throw new Error()
    }

    const saved = JSON.parse(storage.decrypt(Buffer.from(blob.value, 'base64')))

    if (
      !['appOrigin', 'issuer', 'clientId', 'userId', 'refreshToken'].every(
        k => typeof saved[k] === 'string' && saved[k].length > 0
      ) ||
      saved.refreshToken.length > 16_384
    ) {
      throw new Error()
    }

    return saved
  } catch {
    throw new AccountError('stored_session_unavailable')
  }
}

export function parseAccountConfig(value: any, origin: string): AccountConfig {
  try {
    const issuer = new URL(value.issuer)
    const redirect = new URL(value.redirectUri)

    if (
      value.version !== 1 ||
      value.appOrigin !== origin ||
      typeof value.clientId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(value.clientId) ||
      issuer.protocol !== 'https:' ||
      issuer.username ||
      issuer.password ||
      issuer.search ||
      issuer.hash ||
      issuer.pathname !== '/auth/v1' ||
      value.authorizeUrl !== `${issuer.href}/oauth/authorize` ||
      value.tokenUrl !== `${issuer.href}/oauth/token` ||
      redirect.protocol !== 'http:' ||
      redirect.hostname !== '127.0.0.1' ||
      !redirect.port ||
      redirect.pathname !== '/synapsek/callback' ||
      redirect.username ||
      redirect.password ||
      redirect.search ||
      redirect.hash
    ) {
      throw new Error()
    }

    return {
      version: 1,
      appOrigin: origin,
      issuer: issuer.href,
      clientId: value.clientId,
      authorizeUrl: value.authorizeUrl,
      tokenUrl: value.tokenUrl,
      redirectUri: redirect.href
    }
  } catch {
    throw new AccountError('configuration_unavailable')
  }
}

function parseTokens(value: any): Tokens {
  if (
    value?.token_type?.toLowerCase() !== 'bearer' ||
    !['access_token', 'refresh_token'].every(
      k => typeof value[k] === 'string' && value[k].length > 0 && value[k].length <= 16_384
    ) ||
    !Number.isFinite(value.expires_in) ||
    value.expires_in <= 0 ||
    value.expires_in > 86_400
  ) {
    throw new AccountError('invalid_token_response')
  }

  return {
    accessToken: value.access_token,
    refreshToken: value.refresh_token,
    expiresAt: Date.now() + value.expires_in * 1000
  }
}

export function parseAccountSnapshot(value: any): AccountSnapshot {
  const b = value?.billing

  if (
    value?.version !== 1 ||
    typeof value.userId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(value.userId) ||
    typeof value.email !== 'string' ||
    value.email.length > 320 ||
    !b ||
    typeof b.plan !== 'string' ||
    typeof b.status !== 'string' ||
    typeof b.accessSource !== 'string' ||
    !(b.sku === null || typeof b.sku === 'string') ||
    !Number.isSafeInteger(b.includedMonthlyCredits) ||
    b.includedMonthlyCredits < 0
  ) {
    throw new AccountError('invalid_account_response')
  }

  const usage = value.usage
  let safeUsage: AccountSnapshot['usage']

  if (usage !== undefined) {
    const keys = [
      'remainingIncludedCredits',
      'reservedIncludedCredits',
      'purchasedAvailableCredits',
      'monthTokens',
      'debtCredits'
    ] as const

    if (
      !/^\d{4}-\d{2}$/.test(usage?.period || '') ||
      keys.some(key => !Number.isSafeInteger(usage?.[key]) || usage[key] < 0)
    ) {
      throw new AccountError('invalid_account_response')
    }

    safeUsage = {
      period: usage.period,
      remainingIncludedCredits: usage.remainingIncludedCredits,
      reservedIncludedCredits: usage.reservedIncludedCredits,
      purchasedAvailableCredits: usage.purchasedAvailableCredits,
      monthTokens: usage.monthTokens,
      debtCredits: usage.debtCredits
    }
  }

  return {
    userId: value.userId,
    email: value.email,
    managedInferenceEnabled: value.managedInferenceEnabled === true,
    ...(safeUsage ? { usage: safeUsage } : {}),
    billing: {
      plan: b.plan,
      sku: b.sku,
      status: b.status,
      accessSource: b.accessSource,
      includedMonthlyCredits: b.includedMonthlyCredits
    }
  }
}

export async function accountJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000) })

  if (response.status === 404) {
    throw new AccountError('not_available')
  }

  // Limit actual bytes, not just the untrusted Content-Length header.
  const reader = response.body?.getReader()

  if (!reader) {
    throw new AccountError('invalid_response')
  }

  let size = 0
  const chunks: Uint8Array[] = []

  try {
    for (;;) {
      const { value, done } = await reader.read()

      if (done) {
        break
      }

      size += value.length

      if (size > 65_536) {
        throw new AccountError('invalid_response')
      }

      chunks.push(value)
    }

    let body: any

    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      throw new AccountError('invalid_response')
    }

    if (response.status === 403 && body?.code === 'session_binding_required') {
      throw new AccountError('session_binding_required')
    }

    if (response.status === 401 || response.status === 403) {
      throw new AccountError('reauthentication_required')
    }

    if (!response.ok) {
      throw new AccountError('service_unavailable')
    }

    return body
  } finally {
    await reader.cancel()
  }
}

/** Reuse the upstream PKCE generators, but speak standard OAuth form encoding,
 * not the gateway-specific /auth/native JSON protocol. */
export function synapsekBrowserLogin(
  config: AccountConfig,
  open: (url: string) => Promise<void>,
  json = accountJson,
  timeoutMs = 180_000
): Promise<Tokens> {
  const { verifier, challenge } = generatePkcePair()
  const state = generateState()
  const callback = new URL(config.redirectUri)

  return new Promise((resolve, reject) => {
    let done = false

    const finish = (error?: unknown, tokens?: Tokens) => {
      if (done) {
        return
      }

      done = true
      clearTimeout(timer)
      server.close()
      server.closeAllConnections()
      error ? reject(error) : resolve(tokens!)
    }

    let exchanging = false

    const server = http.createServer((req, res) => {
      let url: URL

      try {
        url = new URL(req.url || '/', config.redirectUri)
      } catch {
        res.writeHead(400)
        res.end('Invalid sign-in callback.')

        return
      }

      if (
        req.method !== 'GET' ||
        req.headers.host !== callback.host ||
        url.pathname !== callback.pathname ||
        url.origin !== callback.origin ||
        url.searchParams.getAll('state').length !== 1 ||
        url.searchParams.get('state') !== state
      ) {
        res.writeHead(400)
        res.end('Invalid sign-in callback.')

        return
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer'
      })
      res.end('Return to Hebri to see the sign-in result.')

      if (exchanging || done) {
        return
      }

      exchanging = true
      const code = url.searchParams.get('code')

      if (
        url.searchParams.has('error') ||
        url.searchParams.getAll('code').length !== 1 ||
        !code ||
        code.length > 4096
      ) {
        finish(new AccountError('authorization_denied'))

        return
      }

      void json(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          code,
          code_verifier: verifier,
          redirect_uri: config.redirectUri
        }).toString()
      })
        .then(
          value => finish(undefined, parseTokens(value)),
          () => finish(new AccountError('token_exchange_failed'))
        )
        .catch(() => finish(new AccountError('invalid_token_response')))
    })

    const timer = setTimeout(() => finish(new AccountError('sign_in_timed_out')), timeoutMs)
    server.on('error', () => finish(new AccountError('callback_unavailable')))
    server.listen(Number(callback.port), '127.0.0.1', () => {
      const authorize = new URL(config.authorizeUrl)
      authorize.search = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: 'email profile',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256'
      }).toString()
      void open(authorize.href).catch(() => finish(new AccountError('browser_unavailable')))
    })
  })
}

export class SynapsekAccount {
  private tokens: Tokens | null = null
  private queue: Promise<unknown> = Promise.resolve()
  constructor(
    private readonly origin: string,
    private readonly storage: AccountStorage,
    private readonly open: (url: string) => Promise<void>,
    private readonly json = accountJson,
    private readonly login = synapsekBrowserLogin
  ) {}
  private exclusive<T>(run: () => Promise<T>): Promise<T> {
    const result = this.queue.then(run, run)
    this.queue = result.catch(() => {})

    return result
  }
  private async config() {
    return parseAccountConfig(await this.json(`${this.origin}/api/desktop-account?action=config`), this.origin)
  }
  private async snapshot(tokens: Tokens) {
    return parseAccountSnapshot(
      await this.json(`${this.origin}/api/desktop-account`, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      })
    )
  }
  private async approveSession(tokens: Tokens) {
    const challenge = randomBytes(32).toString('hex')

    const result = await this.json(`${this.origin}/api/desktop-account?action=bind`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge })
    })

    const deadline = Date.parse(result?.expiresAt)

    if (!Number.isFinite(deadline) || deadline <= Date.now() || deadline > Date.now() + 310_000) {
      throw new AccountError('invalid_response')
    }

    await this.open(`${this.origin}/desktop/authorize#binding=${challenge}`)

    while (Date.now() < deadline) {
      try {
        return await this.snapshot(tokens)
      } catch (error) {
        if (!(error instanceof AccountError) || error.code !== 'session_binding_required') {
          throw error
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    throw new AccountError('sign_in_timed_out')
  }
  status(): Promise<SynapsekAccountView> {
    return this.exclusive(async () => {
      const saved = loadAccount(this.storage)

      if (!saved) {
        return { state: 'signed_out' }
      }

      if (saved.appOrigin !== this.origin) {
        throw new AccountError('reauthentication_required')
      }

      const config = await this.config()

      if (saved.issuer !== config.issuer || saved.clientId !== config.clientId) {
        throw new AccountError('reauthentication_required')
      }

      let tokens = this.tokens

      if (!tokens || tokens.expiresAt < Date.now() + 60_000) {
        tokens = parseTokens(
          await this.json(config.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: config.clientId,
              refresh_token: saved.refreshToken
            }).toString()
          })
        )

        // Persist rotation before another request can reuse the old credential.
        try {
          saveAccount({ ...saved, refreshToken: tokens.refreshToken }, this.storage)
        } catch (error) {
          this.tokens = null
          throw error
        }
      }

      const account = await this.snapshot(tokens)

      if (account.userId !== saved.userId) {
        throw new AccountError('account_mismatch')
      }

      this.tokens = tokens

      return { state: 'signed_in', account }
    })
  }
  signIn(): Promise<SynapsekAccountView> {
    return this.exclusive(async () => {
      if (loadAccount(this.storage)) {
        throw new AccountError('sign_out_before_switching')
      }

      if (!this.storage.available()) {
        throw new AccountError('secure_storage_unavailable')
      }

      const config = await this.config()
      const tokens = await this.login(config, this.open, this.json)
      let account: AccountSnapshot

      try {
        account = await this.approveSession(tokens)
        saveAccount(
          {
            appOrigin: this.origin,
            issuer: config.issuer,
            clientId: config.clientId,
            userId: account.userId,
            refreshToken: tokens.refreshToken
          },
          this.storage
        )
      } catch (error) {
        // A failed local save must not silently leave an active device grant.
        // Preserve the original error if the server is also unavailable.
        await this.json(`${this.origin}/api/desktop-account?action=revoke`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokens.accessToken}` }
        }).catch(() => {})
        throw error
      }

      this.tokens = tokens

      return { state: 'signed_in', account }
    })
  }
  async signOut(): Promise<SynapsekAccountView> {
    return this.exclusive(async () => {
      const saved = loadAccount(this.storage)

      if (saved && saved.appOrigin !== this.origin) {
        throw new AccountError('reauthentication_required')
      }

      if (saved && (!this.tokens || this.tokens.expiresAt <= Date.now())) {
        const config = await this.config()

        if (saved.issuer !== config.issuer || saved.clientId !== config.clientId) {
          throw new AccountError('reauthentication_required')
        }

        // Do not require an active account snapshot to finish a previously
        // partial revocation. The revoke endpoint is deliberately idempotent.
        this.tokens = parseTokens(
          await this.json(config.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: config.clientId,
              refresh_token: saved.refreshToken
            }).toString()
          })
        )
        saveAccount({ ...saved, refreshToken: this.tokens.refreshToken }, this.storage)
      }

      if (this.tokens) {
        const result = await this.json(`${this.origin}/api/desktop-account?action=revoke`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.tokens.accessToken}` }
        })

        if (result?.revoked !== true || result?.refreshRevoked !== true) {
          throw new AccountError('revocation_incomplete')
        }
      }

      this.storage.clear() // Authoritative failures surface; no false logout.
      this.tokens = null

      return { state: 'signed_out' }
    })
  }
  openBilling() {
    return this.open(`${this.origin}/billing`)
  }
  async managedRequest(action: 'models' | 'completion', body?: unknown, requestId?: string, expectedUserId?: string) {
    const view = await this.status()

    return this.exclusive(async () => {
      const saved = loadAccount(this.storage)

      if (
        !saved ||
        !this.tokens ||
        view.state !== 'signed_in' ||
        view.account?.userId !== saved.userId ||
        (expectedUserId && saved.userId !== expectedUserId) ||
        !view.account.managedInferenceEnabled
      ) {
        throw new AccountError('inference_not_enabled')
      }

      return managedInferenceJson(`${this.origin}/api/desktop-account?action=${action}`, {
        method: action === 'models' ? 'GET' : 'POST',
        headers: {
          Authorization: `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
          ...(requestId ? { 'Idempotency-Key': requestId } : {})
        },
        ...(action === 'completion' ? { body: JSON.stringify(body) } : {})
      })
    })
  }
  forgetLocal(): Promise<SynapsekAccountView> {
    return this.exclusive(async () => {
      this.storage.clear()
      this.tokens = null

      return { state: 'signed_out' }
    })
  }
}
