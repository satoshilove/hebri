# Synapsek account and billing integration

Status checked 2026-10-20 against `Synapsek-Labs/synapsek-labs` main commit
`4756ea12b1568369a6be1105eb1cfaa577034560` and Hebri release branch
`codex/release-readiness`.

## What is ready now

- Synapsek uses Supabase as the identity authority.
- Stripe Checkout, Billing Portal, signed webhooks, event idempotency, and
  server-side entitlement updates already exist in `api/billing.ts`.
- Synapsek has an encrypted, opaque, host-only web session implementation.
  Its cookie is `__Host-synapsek_session`; access and refresh credentials stay
  server-side.
- Hebri recognizes that cookie in its isolated OAuth browser partition and
  never exposes it to the renderer.
- Hebri already supports authorization-code OAuth with PKCE and encrypted
  native refresh-token storage for remote gateways.

## What is not production-ready yet

- Synapsek's server-managed web session endpoint is deliberately disabled
  unless `SYNAPSEK_WEB_SESSION_ENABLED=1`.
- The tenant/auth cutover is still draft PR #226 and its own release notes say
  not to merge or deploy until the staging, database, canary, KMS, and runtime
  role gates are complete.
- Synapsek does not yet expose a native desktop authorization boundary, OIDC
  discovery/JWKS document, or device authorization endpoint. The native app
  platform document describes this as future work.
- The current Hebri cloud discovery path expects `/api/agents` and a portal
  session, but Synapsek main does not yet provide that complete contract.
- Stripe is not an identity provider. The desktop must never receive a Stripe
  secret, Supabase service-role key, or raw browser refresh token.

Do not enable `HEBRI_PORTAL_BASE_URL` in public builds until the portal contract
below passes staging. Leaving it unset keeps local, SSH, and remote gateway
modes working without silently falling back to an upstream service.

## Target ownership

| Concern | Authority |
| --- | --- |
| User identity, MFA, OAuth providers | Supabase through Synapsek server APIs |
| Browser session | Synapsek opaque `__Host-synapsek_session` cookie |
| Native Hebri session | Synapsek-issued, audience-bound tokens stored in the OS keychain |
| Subscription and invoices | Stripe, mediated only by Synapsek server APIs |
| Plan, seats, connector access | Synapsek entitlement records updated by verified Stripe webhooks |
| Agent/gateway access | Short-lived Synapsek grant for the selected workspace and agent |
| Connector secrets | Synapsek AWS KMS/Secrets/DynamoDB boundary; never the desktop token store |

## Step-by-step rollout

### 1. Finish the Synapsek web-session cutover

1. Rebase draft PR #226 on current `main` so it includes the merged dependency
   and AWS permission-boundary upgrades.
2. Apply the additive session and tenant migrations to isolated staging by an
   authenticated migration path. Record the change set and rollback.
3. Complete the request-ID audit rehearsal, runtime-role preflight, KMS/canary
   evidence, network/ECS role qualification, and execution-role hardening
   listed in PR #226.
4. Migrate every browser bearer-token consumer behind same-origin Synapsek
   APIs. Do not enable the cookie while Storage, Studio, billing, voice, or
   agent calls still depend on browser-held Supabase refresh credentials.
5. Exercise password, email OTP, recovery, MFA, Google OAuth, invitations,
   logout, expiry, multi-tab refresh, CSRF, and cross-tenant tests in staging.
6. Enable `SYNAPSEK_WEB_SESSION_ENABLED=1` only in staging, canary it, then
   enable production with a tested rollback.

### 2. Add a native desktop authorization boundary

Implement this in the Synapsek repository; do not reuse the browser cookie as a
desktop bearer token.

1. Register a public client named `hebri-desktop`. It must use Authorization
   Code with PKCE (`S256`) and must not have a client secret.
2. Publish HTTPS discovery metadata and JWKS, or an equivalent pinned issuer
   contract. The issuer should be Synapsek-owned and the access-token audience
   must be `hebri`.
3. Add a one-time authorization endpoint that accepts `client_id`,
   `redirect_uri`, `state`, `code_challenge`, and
   `code_challenge_method=S256`. Bind the code to the user, device, redirect,
   challenge, and selected workspace; expire it within five minutes and allow
   one use.
4. Add token, refresh, and revocation endpoints. Rotate refresh tokens, detect
   reuse, revoke the device family on replay, and keep access tokens short
   lived (roughly 5–15 minutes).
5. Include only necessary claims: `iss`, `aud`, `sub`, `exp`, `iat`, `jti`,
   `workspace_id`, `role`, `plan`, `seat_status`, and connector/agent scopes.
   Do not embed Stripe customer IDs, secrets, or mutable payment details.
6. Provide a device/session list and remote revoke action in the Synapsek
   account portal.

### 3. Expose one server-owned entitlement contract

1. Keep Stripe webhooks authoritative for subscription changes. Continue
   verifying signatures, rejecting stale events, and processing event IDs
   idempotently.
2. Normalize individual and workspace entitlements into one response, for
   example `GET /api/account/entitlements`, authenticated by the native access
   token.
3. Return the active workspace, role, plan, seat state, usage/credit summary,
   allowed connectors, and allowed managed agents. Never let a desktop claim
   grant more access than the current server record.
4. Make checkout and billing-portal endpoints return Synapsek-hosted URLs. The
   desktop opens those URLs in the system browser; it does not call Stripe.
5. On webhook changes, make entitlement reads reflect the new state and revoke
   or narrow grants whose seat/subscription is no longer valid.

### 4. Complete the Hebri desktop side

1. Set `HEBRI_PORTAL_BASE_URL` to the production Synapsek origin only in a
   release candidate after steps 1–3 pass staging.
2. Open sign-in in the system browser, generate PKCE and state in the main
   process, and accept only the registered loopback/deep-link callback.
3. Verify issuer, audience, signature, expiry, state, nonce/code verifier, and
   workspace before accepting the session.
4. Store only the rotating native refresh credential in the OS keychain. Keep
   access tokens in memory where possible; never expose either token to guest
   web content or renderer local storage.
5. Use the Synapsek entitlement response to render plan/seat/connector state.
   Open Checkout or Billing Portal URLs externally.
6. Exchange the native session for a short-lived, agent-specific gateway grant
   before connecting. Agents and bots may read team state only through the
   selected workspace and explicit scopes.
7. Add logout, remote revoke, expired-session recovery, offline behavior, and
   account-switch tests on Windows, Omarchy/Arch, Ubuntu/Debian, and macOS.

### 5. Release gates

1. Run the Synapsek typecheck, full unit suite, production build, migration and
   RLS tests, auth E2E, Stripe webhook replay tests, and cross-tenant probes.
2. Run Hebri Python tests, renderer tests, Electron tests, package smoke tests,
   and clean-machine installs for Windows EXE/MSI, Linux AppImage/DEB/RPM, and
   macOS DMG/ZIP.
3. Verify upgrades from the last public build retain config and chats, replace
   legacy launcher branding, and can roll back safely.
4. Publish a release candidate to an internal team first. Confirm login,
   checkout, billing portal, seat changes, logout/revoke, agent access, and
   connector denial after entitlement removal.
5. Only then merge the Hebri release branch to public `main`, tag the version,
   publish checksummed artifacts, and enable the production portal base URL.

## Production environment values

Set values in the deployment secret/configuration systems, not in Git:

- Synapsek: `SYNAPSEK_APP_URL`, Supabase URL/publishable key, server-only
  Supabase secret, web-session encryption keyring, Stripe secret and webhook
  secret, and native issuer/signing-key configuration.
- Hebri release build/runtime: `HEBRI_PORTAL_BASE_URL` only after the portal is
  live. Keep legacy `HERMES_*` names internally only where compatibility
  requires them; do not advertise them to users.

Never copy production Supabase, Stripe, KMS, or signing secrets into preview
deployments, desktop packages, repository files, logs, or chat messages.
