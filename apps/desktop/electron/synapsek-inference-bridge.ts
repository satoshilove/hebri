import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import http from 'node:http'

import { AccountError } from './synapsek-account'

interface ManagedAccount {
  status(): Promise<{ state: string; account?: { userId: string } }>
  managedRequest(
    action: 'models' | 'completion',
    body?: unknown,
    requestId?: string,
    expectedUserId?: string
  ): Promise<any>
}

/** Local runtime adapter. No OAuth credential or provider key crosses this socket. */
export async function startSynapsekInferenceBridge(account: ManagedAccount) {
  const secret = randomBytes(32).toString('hex')
  let host = ''
  let owner: string | undefined

  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json')

    const fail = (status: number, code: string) => {
      res.writeHead(status)
      res.end(JSON.stringify({ error: { message: code, type: 'synapsek_error', code } }))
    }

    const supplied = Buffer.from(String(req.headers.authorization || ''))
    const expected = Buffer.from(`Bearer ${secret}`)

    if (
      req.headers.host !== host ||
      req.headers.origin ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      fail(401, 'unauthenticated')

      return
    }

    const models = req.method === 'GET' && req.url === '/v1/models'
    const completion = req.method === 'POST' && req.url === '/v1/chat/completions'

    if (!models && !completion) {
      fail(404, 'not_found')

      return
    }

    // SDK retries cannot repeat a possibly accepted paid generation. The user
    // can deliberately retry with a new turn after inspecting the result.
    if (Number(req.headers['x-stainless-retry-count'] || 0) > 0) {
      fail(409, 'automatic_retry_disabled')

      return
    }

    try {
      let body: any

      if (completion) {
        if (!String(req.headers['content-type']).startsWith('application/json')) {
          fail(415, 'json_required')

          return
        }

        let size = 0
        const chunks: Buffer[] = []

        for await (const chunk of req) {
          size += chunk.length

          if (size > 512_000) {
            fail(413, 'request_too_large')

            return
          }

          chunks.push(Buffer.from(chunk))
        }

        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          fail(400, 'invalid_json')

          return
        }
      }

      const view = await account.status()

      if (view.state !== 'signed_in' || !view.account) {
        throw new AccountError('inference_not_enabled')
      }

      owner ??= view.account.userId

      if (owner !== view.account.userId) {
        throw new AccountError('restart_after_account_switch')
      }

      const result = await account.managedRequest(models ? 'models' : 'completion', body, randomUUID(), owner)

      if (!models && body?.stream === true) {
        // The server completes receipt settlement before releasing a response.
        // Preserve the OpenAI stream contract for the existing Hebri runtime.
        res.setHeader('Content-Type', 'text/event-stream')
        const base = { id: result.id, object: 'chat.completion.chunk', created: result.created, model: result.model }

        const choices = result.choices.map((choice: any) => ({
          index: choice.index,
          delta: {
            ...choice.message,
            ...(choice.message.tool_calls
              ? { tool_calls: choice.message.tool_calls.map((t: any, index: number) => ({ ...t, index })) }
              : {})
          },
          finish_reason: null
        }))

        res.write(`data: ${JSON.stringify({ ...base, choices })}\n\n`)
        res.write(
          `data: ${JSON.stringify({ ...base, choices: result.choices.map((c: any) => ({ index: c.index, delta: {}, finish_reason: c.finish_reason })) })}\n\n`
        )

        if (body.stream_options?.include_usage) {
          res.write(`data: ${JSON.stringify({ ...base, choices: [], usage: result.usage })}\n\n`)
        }

        res.end('data: [DONE]\n\n')
      } else {
        res.end(JSON.stringify(result))
      }
    } catch (error) {
      const code = error instanceof AccountError ? error.code : 'managed_inference_unavailable'
      const status = code === 'shared_budget_exhausted' ? 402 : code === 'request_already_submitted' ? 409 : 400
      fail(status, code)
    }
  })

  server.requestTimeout = 200_000
  server.headersTimeout = 10_000
  server.maxConnections = 8
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Local inference listener unavailable')
  }

  host = `127.0.0.1:${address.port}`
  server.unref()

  return {
    env: { HEBRI_SYNAPSEK_BRIDGE_URL: `http://${host}/v1`, HEBRI_SYNAPSEK_BRIDGE_TOKEN: secret },
    close: () => new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())))
  }
}

export async function managedInferenceJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(190_000) })
  const reader = response.body?.getReader()

  if (!reader) {
    throw new AccountError('invalid_response')
  }

  const chunks: Uint8Array[] = []
  let size = 0

  try {
    for (;;) {
      const part = await reader.read()

      if (part.done) {
        break
      }

      size += part.value.length

      if (size > 2_000_000) {
        throw new AccountError('invalid_response')
      }

      chunks.push(part.value)
    }

    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'))

    if (!response.ok) {
      const codes = [
        'shared_budget_exhausted',
        'request_already_submitted',
        'inference_not_enabled',
        'personal_paid_plan_required',
        'request_budget_too_large',
        'model_or_context_unavailable',
        'manual_model_not_in_plan',
        'usage_settlement_pending'
      ]

      throw new AccountError(codes.includes(result.code) ? result.code : 'managed_inference_unavailable')
    }

    return result
  } finally {
    await reader.cancel().catch(() => {})
  }
}
