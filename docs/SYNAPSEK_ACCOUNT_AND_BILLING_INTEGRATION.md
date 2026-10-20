# Synapsek account and billing integration

## Current candidate — 21 October 2026

The account branch has incorporated main `53f2e918` (desktop 0.17.11).
The earlier staging native sign-in/session-binding/revocation test passed.
The new shared-spending candidate is **not yet activated or released**.

It adds Synapsek to the existing model-provider plugin registry. Desktop-owned
local backends receive an ephemeral authenticated loopback capability; OAuth
and refresh tokens stay in Electron's protected account controller. The existing
Hebri agent, tools and provider transport perform the work. Nous/BYOK and remote
connections keep their existing paths.

Users sign in with Synapsek, explicitly approve shared-credit inference, then
choose Synapsek in the model picker. Personal Plus/Pro/Max use the website's
existing included-credit and purchased-credit ledger. Every model iteration,
including tool follow-ups, consumes that shared balance. Settings show remaining,
reserved and purchased credits plus monthly token reporting. Browser billing
continues through the existing Synapsek Stripe checkout/portal.

A running local bridge binds to its first verified account. After switching
the signed-in account, restart Hebri before using Synapsek inference. Old
runtimes cannot silently spend the new account's balance. The server rechecks
identity, native-client/session binding, revocation, plan and budget per call.
Local history is still local profile data, not cloud account-isolated storage.

Current limits: personal paid plans only; no Business workspace spending,
free-trial pool, SSH bridge forwarding or broad production enrollment. Responses
use the streaming wire format after the server completes receipt settlement;
this is buffered output, not immediate token streaming. Ambiguous failures hold
a reservation for receipt recovery/review instead of inventing a final charge.

The Synapsek candidate's `docs/HEBRI_SHARED_USAGE_RELEASE.md` is the paired rollout
runbook. Staging requires the missing purchased-wallet/refund migrations before
the new inference migration, explicit test-account entitlements and fresh consent.
Both draft PRs must pass review/CI, real shared-spend and Stripe test lifecycle
checks, and signed-installer qualification before customer release.

The sections below retain the original account-only design and its dated audit;
they are not evidence that the new managed-inference release is complete.

Status checked 2026-10-20 against `Synapsek-Labs/synapsek-labs` main commit
`4756ea12b1568369a6be1105eb1cfaa577034560` and Hebri main commit
`3b0b71f2b6c07ca7d86c31ed1acf7ca16a16f9c5` (desktop 0.17.10). Recheck both heads before
implementation or release: Hebri is under active development.

## Implementation checkpoint — internal preview

The candidate adds a separate Synapsek account controller and Billing panel.
It uses the upstream PKCE generators but the standard Supabase OAuth protocol,
not the Nous portal device-code endpoints or remote gateway JSON token protocol.
Nous model-provider credentials, billing, and gateway connections remain separate.

Refresh credentials are OS-encrypted in a dedicated Electron-main store; plaintext
fallback is refused, including Linux `basic_text`. Access tokens stay in the main
process. Saved credentials bind the portal origin, issuer, client and immutable
user ID. Refresh and account switching are serialised. Logout has a durable
server deny record and upstream refresh revocation; a failed revoke is visible,
and local-only removal is explicitly distinguished from server revocation.

The matching Synapsek candidate provides `/api/desktop-account` and
`/desktop/authorize`. Activation defaults off and requires an explicit UUID
cohort. Consent uses the existing opaque website session and CSRF checks.
Personal plan information comes from existing server billing metadata. Browser
purchases use the existing `/billing` flow. This is not a new Stripe checkout.

**Not released or qualified yet:** real Supabase authorization/refresh/logout,
OS keychain operation in packaged installers, Stripe test-mode lifecycle, team
workspace selection, shared usage balances and Synapsek-funded model calls.
The panel labels included monthly allocation, not remaining spendable balance.

### Staging activation order

The browser inspection on 20 October confirmed a separate project named
**Synapsek Staging**, with OAuth disabled and the site URL
`https://synapsek-staging.vercel.app`. Its inspected schemas have 59 relations
readable by `authenticated`, all with RLS, but zero policies referencing
`client_id`. The one callable SECURITY DEFINER application function is the
workspace-read predicate `agent_execution_can_read`. This is not evidence of
cross-tenant disclosure; it is evidence that ordinary website RLS does not yet
enforce this preview's narrower native-client access.

1. Deploy the matching Synapsek candidate only to staging, initially with
   `SYNAPSEK_DESKTOP_ACCOUNTS_ENABLED=0`. Verify it has staging-only Supabase and
   Stripe test-mode configuration and a working opaque website login.
2. Review/apply `scripts/sql/desktop_account_sessions.sql` and
   `scripts/sql/desktop_oauth_boundary.sql`. The latter adds restrictive
   client-ID checks to currently exposed tables and the known workspace
   predicate, and aborts for unreviewed views, tables without RLS or callable
   SECURITY DEFINER functions. Re-run that inventory with future migrations;
   the policy does not automatically cover future tables.
3. Verify direct database/Storage access is denied for OAuth, website ownership
   and membership still work, and OAuth cannot enter legacy website APIs or
   become an opaque website session. The candidate adds those API rejection
   filters; signature verification remains authoritative.
4. Enable the staging OAuth server with dynamic registration disabled. Register
   one public Hebri client with PKCE S256, no embedded client secret, scopes
   `email profile` and the exact callback
   `http://127.0.0.1:49183/synapsek/callback`. Set its authorization path to
   `/desktop/authorize`. This security-sensitive live change needs action-time
   confirmation when performed through the browser.
5. Set staging-only `SYNAPSEK_APP_URL`, `SUPABASE_URL`,
   `SYNAPSEK_DESKTOP_OAUTH_CLIENT_ID`, `SYNAPSEK_DESKTOP_REDIRECT_URI`,
   and an explicit `SYNAPSEK_DESKTOP_ACCOUNT_USERS` list. Enable the preview
   only after the boundary checks. Launch the isolated desktop with the
   existing `HEBRI_PORTAL_BASE_URL` override pointing to staging.
6. Use two disposable test users for sign-in, A→B→A switching, restart,
   concurrent refresh, MFA, logout/revoke, wrong-client, wrong-user, replay and
   timeout tests. Test Supabase Auth endpoints as well as database, Storage and
   website APIs; OAuth scopes alone are not an access boundary.
7. In Stripe test mode, check paid upgrade, cancellation, past-due and webhook
   retry behaviour against the existing billing projection. Do not charge a
   live card or treat a browser return as payment evidence.
8. Only after those gates, qualify signed installers and a separate production
   client. Keep managed inference disabled until the shared budget/settlement
   gateway is implemented and tested.

Rollback: disable the desktop flag first and revoke the preview client grants.
Keep revocation records. Do not remove the restrictive database policies while
OAuth tokens may still be valid. No production database or OAuth setting was
changed during this implementation.

## Recommended decision

Make Hebri a native client of the existing Synapsek account and paid services.
Reuse Supabase identity, Synapsek membership/entitlement checks, the existing
Stripe customer/subscription, and the existing usage ledger. Keep the agent
running locally or on the user's selected gateway. Desktop account integration
does not require a new hosted agent fleet, another identity provider, or a new
Stripe catalogue.

Deliver two explicit milestones:

- **Account-connected desktop:** sign in, select an authorised workspace, see
  the existing plan/credits, open browser billing, sign out and revoke devices.
  Existing local/BYOK operation continues. This milestone does not claim that
  Synapsek credits fund model calls.
- **Managed-use desktop:** select Synapsek as the model service; every model
  iteration uses the same server-enforced budget as the website. This milestone
  is required before advertising a subscription-powered Hebri experience.

The first implementation task is a bounded staging proof of the managed OAuth
contract and a dedicated protected account store. Reuse the existing native
PKCE transport where compatible; do not build a second generic OAuth server
or overwrite the inherited Nous billing/provider integration.

## What changed in 0.17.10

Compared with reviewed `cb142bac`, 16 paths changed (207 additions, 25 deletions):
Synapsek theme/wordmark, separate desktop/runtime version reporting, desktop
package version, package-validation scripts and associated tests. Native OAuth,
token persistence, billing adapters and the account integration runbook were
unchanged upstream. The account integration gaps below therefore remain.

GitHub run [39419949915](https://github.com/satoshilove/hebri/actions/runs/39419949915)
for this exact head: Windows and Linux succeeded; both macOS builds failed;
the release job was skipped. Non-expired Windows and Linux CI artifact bundles
were present; no macOS bundle was present. Both macOS logs report the desktop directory is
"not a file" immediately after code-signing setup, with an empty signing
password reported. Investigate optional signing environment handling first;
this is a diagnostic lead, not a proven root cause. Do not disable signing as
the production fix. Verify signing/notarisation on the resulting artifacts.

The GitHub releases collection returned no entries and fetched tags were empty
at review time. This verifies source and CI artifacts, not a published,
installed 0.17.10 binary. A separately distributed local installer needs its
own hash, provenance, version and upgrade smoke test.

## What is ready now

- Synapsek uses Supabase as the identity authority.
- Stripe Checkout, Billing Portal, signed webhooks, event idempotency, and
  server-side entitlement updates already exist in `api/billing.ts`.
- Synapsek has an encrypted, opaque, host-only web session implementation.
  Its cookie is `__Host-synapsek_session`; access and refresh credentials stay
  server-side.
- Hebri recognizes that cookie in its isolated OAuth browser partition and
  never exposes it to the renderer.
- Hebri already supports authorization-code OAuth with PKCE for remote
  gateways. This is reusable transport logic, not a completed Synapsek login.
- The public production `/api/authMode` returned `{"mode":"cookie"}` and
  `/api/health` returned revision `4756ea12b156` during this review.

## What is not production-ready yet

- The web-session code remains gated by `SYNAPSEK_WEB_SESSION_ENABLED=1`,
  but production currently reports cookie mode. Do not repeat the browser
  session migration as an assumed prerequisite; verify the deployed contract.
- The Synapsek account upgrade is treated as completed independently of Hebri.
  Hebri's gate is verification against the deployed production contract, not
  approval or merger of a particular Synapsek pull request.
- Synapsek's reviewed application route manifest does not expose the
  `/auth/native/*` contract expected by Hebri's remote-gateway OAuth adapter.
  Supabase's project dashboard has OAuth Server (beta) disabled. Supabase's
  own signing/discovery facilities must not be confused with an implemented
  Hebri public-client registration and consent flow.
- The current Hebri cloud discovery path expects `/api/agents` and a portal
  session, but Synapsek main does not yet provide that complete contract.
- Live Stripe account activation, price objects and webhook delivery were
  not reverified in this pass: the Stripe dashboard was signed out. Historical
  runbook statements about test mode are not current evidence. The signed-in
  website account has admin-granted access, not proof of a paid renewal.
- Desktop billing still dispatches `billing.*` / `subscription.*` JSON-RPC
  through `agent/billing_view.py` and `hermes_cli/nous_billing.py`. Those
  resolve a Nous identity and a different HTTP contract. Changing
  `HEBRI_PORTAL_BASE_URL` does not connect this billing path to Synapsek.
- Native credentials are not guaranteed encrypted by current production
  wiring. `main.ts` passes `encryptDesktopSecret` to the native token store;
  `secret-storage-policy.ts` defaults encryption off, and that helper returns
  `encoding: 'plain'`. The legacy migration can also rewrite encrypted
  credentials as plaintext. The new Synapsek account store must be excluded
  from that downgrade path.
- Synapsek's optional hosted Hebri worker is a separate product track. It is
  not required for desktop installation, Synapsek account login, billing, or
  local/remote gateway use.
- Stripe is not an identity provider. The desktop must never receive a Stripe
  secret, Supabase service-role key, or raw browser refresh token.

Hebri now defaults portal links to `https://synapseklabs.org` and ignores the
legacy upstream portal environment variables. Use `HEBRI_PORTAL_BASE_URL` only
for a Synapsek-owned staging origin or loopback development. Local, SSH, and
remote gateway modes remain independent of portal availability.

## Target ownership

| Concern | Authority |
| --- | --- |
| User identity, MFA, OAuth providers | Supabase through Synapsek server APIs |
| Browser session | Synapsek opaque `__Host-synapsek_session` cookie |
| Native Hebri session | Registered managed OAuth client; protected refresh credential and server-validated client/session identity |
| Subscription and invoices | Stripe, mediated only by Synapsek server APIs |
| Plan, seats, connector access | Synapsek entitlement records updated by verified Stripe webhooks |
| Agent/gateway access | Short-lived Synapsek grant for the selected workspace and agent |
| Connector secrets | Synapsek AWS KMS/Secrets/DynamoDB boundary; never the desktop token store |

## Step-by-step rollout

### 1. Freeze the contract, not ongoing Hebri development

1. Rebase the isolated integration branch onto the latest reviewed Hebri head.
   Keep changes to account modules and narrow IPC/API adapters. Record desktop,
   runtime and server versions separately.
2. Reuse the deployed opaque web-session flow. Production already reported
   cookie mode in this audit; do not restart a completed migration or tie
   native sign-in to historical PR approvals.
3. Prepare an isolated Supabase/Stripe test environment and Synapsek preview
   with test-only users, prices and secrets. Preview must not write production
   billing or customer data. Verify this before the first test.
4. Agree version 1 of the native account API and structured errors before
   wiring UI. Existing website endpoints and cookie/CSRF rules stay intact.
5. Recheck the actual Stripe account, recurring price IDs, webhook endpoint,
   signing configuration and recent delivery status. The previous signed-out
   Stripe dashboard means these remain unverified, not known broken.

### 2. Add a native desktop authorization boundary

Implement this in the Synapsek repository; do not reuse the browser cookie as a
desktop bearer token.

1. Register a public client named `hebri-desktop`. It must use Authorization
   Code with PKCE (`S256`) and must not have a client secret.
2. First qualify the existing Supabase OAuth Server in staging as a managed
   issuer, rather than assuming a new custom authorization server is needed.
   It is currently beta and disabled in production. Its public-client,
   redirect, refresh/revocation and RLS behavior must pass the release gates.
   Keep dynamic client registration disabled unless separately required.
   Publish or pin the selected issuer contract; do not mix Supabase OAuth
   responses with the existing remote-gateway `/auth/native/*` token format.
3. Use the managed issuer's authorization, token and refresh endpoints, rather
   than implementing duplicates. Add the Synapsek consent page and server-side
   adapter to the existing opaque web session: look up, approve and deny the
   authorization using the authenticated user on the server, with CSRF checks.
   Never move browser refresh tokens into JavaScript to follow an SDK example.
4. Prove PKCE S256, state, exact callback matching, single-use codes, refresh
   rotation/replay behavior and revocation. Prefer an ephemeral loopback
   listener bound to 127.0.0.1, with strict path/state checks. Confirm the
   issuer's loopback-port registration behavior in staging; do not assume
   wildcard redirects work. If unsupported, evaluate a verified app-link or
   exact registered callback rather than broadening the redirect allowlist.
5. Validate the chosen issuer's actual token contract. Supabase OAuth access
   tokens normally use `aud: authenticated` plus `client_id`; ID tokens use
   the client ID as audience. A separately issued Synapsek capability can use
   `aud: hebri`, but is a different token. Do not silently substitute an ID
   token for an API credential. Keep current workspace membership, role,
   subscription and credit decisions server-authoritative rather than
   trusting stale plan/seat claims.
6. Provide a device/session list and remote revoke action in the Synapsek
   account portal.
7. Before enabling the production OAuth client, audit every exposed database,
   Storage, Realtime and RPC policy for the new token's `client_id`. OAuth
   scopes do not automatically restrict Supabase data access. The native
   account client must not acquire general database access merely because its
   JWT has the `authenticated` role. Build explicit deny/allow coverage and
   test direct API attempts, not only the Synapsek gateway.
8. Keep a server-side revocable native-session record bound to the verified
   subject and issuer session, if the managed issuer's revocation semantics
   alone cannot meet the immediate API-denial requirement. Check it on each
   paid or privileged request. Revoke refresh grants too; an unexpired JWT is
   not sufficient after logout, device revocation or membership removal.
   Qualify these semantics before choosing an extra token exchange.

If the managed option fails these bounded qualification gates, record the
specific failure and review a narrow alternative. Do not silently enable a
custom issuer or turn this into an open-ended infrastructure migration.

### 3. Expose one server-owned entitlement contract

1. Keep Stripe webhooks authoritative for subscription changes. Continue
   verifying signatures, rejecting stale events, and processing event IDs
   idempotently.
2. Verify the existing live account, prices and production webhook before
   creating anything. Reuse the existing customer/subscription mappings;
   do not create a second catalogue or second subscription just for Hebri.
   Complete only genuinely missing activation/settings, then run signed
   replay/idempotency and renewal tests in Stripe test mode.
3. Normalize individual and workspace entitlements into one response, for
   example `GET /api/account/entitlements`, authenticated by the native access
   token.
4. Return the active workspace, role, plan, seat state, usage/credit summary,
   allowed connectors, and allowed managed agents. Never let a desktop claim
   grant more access than the current server record.
5. Make checkout and billing-portal endpoints return Synapsek-hosted URLs. The
   desktop opens those URLs in the system browser; it does not call Stripe.
6. On webhook changes, make entitlement reads reflect the new state and revoke
   or narrow grants whose seat/subscription is no longer valid.

### 4. Complete the Hebri desktop side

1. Keep the default production origin or set `HEBRI_PORTAL_BASE_URL` to a
   Synapsek-owned staging origin in release candidates. Do not set legacy
   `HERMES_PORTAL_BASE_URL` or `NOUS_PORTAL_BASE_URL`; Hebri ignores them.
2. Open sign-in in the system browser, generate PKCE and state in the main
   process, and accept only the registered loopback/deep-link callback.
3. Validate state and the PKCE callback in the main process; verify issuer,
   signature, expiry and the documented audience/client claims with maintained
   OAuth/OIDC libraries. Validate nonce when using OIDC. Verify API credentials
   again on the server; the desktop's checks are not an authorization boundary.
   Select workspace only from server-verified memberships.
4. Store only the rotating native refresh credential using a dedicated,
   mandatory OS-protected store. Keep access tokens in memory where possible;
   never expose either token to guest web content or renderer local storage.
   Do not reuse the existing opt-in plaintext policy or legacy downgrade
   migration. If secure storage is unavailable (including an unprotected
   Linux basic-text backend), offer session-only login or a clear error.
   Persistence failure must be surfaced; current generic native-store writes
   log filesystem failures without throwing.
5. Use the Synapsek entitlement response to render plan/seat/connector state.
   Open Checkout or Billing Portal URLs externally.
6. Keep account credentials separate from gateway/provider credentials. For a
   future managed gateway, use a short-lived gateway-specific grant; do not
   forward the account refresh credential to SSH hosts or remote gateways.
   Local/BYOK and current remote gateway modes need no hosted-agent grant.
   Agents may read team state only through explicit workspace-scoped APIs.
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
5. Enable the production account capability for an internal cohort, then tag
   the tested candidate and publish verified installers. The production portal
   origin already exists; rollout must use a server-side client/cohort gate,
   not changing URLs as a substitute for authorization.

## Native API and privacy contract

The following routes are proposed versioned native endpoints, not existing
production capabilities. Final route names may follow repository conventions,
but keep their responsibilities and authentication explicit:

| Contract | Response/action | Boundary |
| --- | --- | --- |
| `GET /api/desktop/v1/account` | Subject ID, display information, valid workspace memberships, native session ID and contract version | Validate issuer/client/session; no arbitrary subject parameter |
| `GET /api/desktop/v1/entitlements?workspace_id=...` | SKU, access source, status, role, effective features and authoritative usage summary | Recheck membership; self-owned personal or authorised workspace billing subject |
| `POST /api/desktop/v1/session/revoke` | Idempotently revoke current device session and its refresh grant | Own session; durable server denial and local cleanup |
| Later: managed inference adapter | Allowed model calls and measured streaming results | Current membership, active grant, quota, budget reservation and settlement |

Return stable `unauthenticated`, `session_revoked`, `workspace_forbidden`,
`billing_unavailable`, `budget_exhausted` and `client_upgrade_required` errors.
Do not turn a network timeout into logout or pretend stale entitlements are
current. Existing website billing stays cookie-authenticated and CSRF-protected.
Desktop initially opens fixed allowlisted `/billing` or `/pricing` URLs in the
system browser; no new billing mutation endpoint is needed. If browser and
desktop are signed into different accounts, show the browser's billing subject
and require the user to switch; never silently purchase for another identity.

No token, email or customer ID in purchase URLs. Do not accept a client-supplied
Stripe customer ID, seat role, price, credit balance or plan as authority.
Cache UI state by issuer + subject + workspace. Account switch must discard
requests/caches from the previous account and require explicit association
before sending an existing local conversation under another account.

Signing in must not upload local chats, memory, files, team messages or browser
history. Managed model requests necessarily send the selected task context;
explain that at service selection. Separate team sharing and history sync
require explicit product flows. Local team/profile names are not verified
Synapsek memberships.

Use narrow Electron IPC operations; never return raw account tokens to the
renderer, preview webviews, plugins or task tools. A local agent with arbitrary
shell access under the same OS user is not isolated by the OS keychain alone.
Do not claim strong isolation from local malware or an unrestricted same-user
agent. Protect the high-value server credentials, limit/revoke native grants,
cap spending and separate local permission approvals from billing permission.

## Delivery packages and completion evidence

| Package | Repository | Completion evidence |
| --- | --- | --- |
| 0. Release baseline | Hebri | Fix macOS packaging; verify platform signing, install/upgrade, exact desktop/runtime versions |
| 1. Native authorization proof | Synapsek staging + small Hebri harness | Existing user completes browser login and MFA; wrong redirect/client/state, replay, direct data access and revoked sessions fail |
| 2. Protected account session | Hebri | Dedicated strict store, single refresh coordinator, typed IPC, restart/logout, disk-write failures and A → B → A tested on supported OSes |
| 3. Account and plan adapter | Both | Non-admin subscriber sees same SKU/credits as website; free user and removed member denied correctly; browser purchase changes state only after webhook reconciliation |
| 4. Managed inference | Both | Existing provider adapter interface calls Synapsek; server enforces shared credits, concurrent spend, retries and cancellation across complete agent loops |
| 5. Controlled rollout | Both | Internal cohort passes representative full tasks, then public release with backward-compatible API and documented rollback |

Package 0 can proceed alongside packages 1–3. Account-connected internal testing
can finish before managed inference, but package 4 is mandatory for paid
Synapsek-funded use. No dependency on provisioning a cloud computer per user.

Required end-to-end scenarios:

- Existing paid account on two devices; annual and monthly products; no second
  Stripe subscription; customer portal cancel-at-period-end and resubscribe.
- Stripe sandbox/test clocks for renewal, failed payment, recovery, cancellation
  and webhook duplicate/out-of-order delivery. Reconcile current subscription
  state; event arrival order alone is not authoritative.
- Team owner/member, seat reduction, removed member, guessed workspace IDs and
  cross-account resource IDs. No billing-owner powers granted to ordinary members.
- Real Hebri code/debug task, document/image task, browser research task, and a
  bot with repeated tool/model calls. Test streaming, model switch, cancellation,
  reconnect, budget exhaustion and approval-required local actions.
- Cold start/restart, offline mode, expired/replayed refresh, concurrent windows,
  unavailable keychain, failed persistence, account switch and remote revocation.

Use additive database/API changes and a server-side native-client kill switch.
On failure disable new native sign-ins or managed calls, revoke affected native
grants and roll back the desktop/server adapter. Preserve website login, Stripe
webhooks and existing local/BYOK work. Never roll back payments or drop customer
records as an application rollback. Keep telemetry to redacted operational
metadata; no tokens or task content in auth/billing logs.

Land small PRs with a pinned contract version and shared fixtures. Recheck Hebri
main before each PR; do not overwrite concurrent UI/team/runtime changes. Public
client identifiers are not secrets or proof of an official binary, so server
access decisions must rely on authenticated users and scoped grants.

## Production environment values

Set values in the deployment secret/configuration systems, not in Git:

- Synapsek: `SYNAPSEK_APP_URL`, Supabase URL/publishable key, server-only
  Supabase secret, web-session encryption keyring, Stripe secret and webhook
  secret, and native issuer/signing-key configuration.
- Hebri release build/runtime: optional `HEBRI_PORTAL_BASE_URL` for a
  Synapsek-owned staging/custom portal. Keep legacy `HERMES_*` names internally only where compatibility
  requires them; do not advertise them to users.

Never copy production Supabase, Stripe, KMS, or signing secrets into preview
deployments, desktop packages, repository files, logs, or chat messages.

## Existing plan and API mapping

These are values from the reviewed production source, not a fresh verification
of live Stripe Price objects. USD prices are before applicable tax.

| SKU | Monthly | Annual | Monthly credits | Seats |
| --- | ---: | ---: | ---: | --- |
| `plus` | $20 | $200 | 1,000 | 1 |
| `pro` | $59 | $590 | 4,000 | 1 |
| `max` | $99 | $990 | 8,000 | 1 |
| `business_standard` | $29/seat | $288/seat | 1,500/seat | Minimum 2 |
| `business_premium` | $99/seat | $1,068/seat | 8,000/seat | Minimum 2 |
| `business_growth` | $299 | None | 20,000 | 5 included |

Use the server's `sku` for plan identity. The coarse runtime plan is not a
price/SKU: both Pro and Max map to `pro`, and business plans share a runtime
tier. Purchased credits are a separate balance, not dollars or a new plan.
Free/admin/trial access must stay distinguishable from a paid subscription.

The existing website owns:

- `GET /api/billing-state`: effective plan, SKU, cycle, subscription status,
  quantity, purchased-credit summary and billing-schema readiness.
- `POST /api/stripe-checkout`: subscription checkout.
- `POST /api/stripe-credit-checkout`: credit-pack checkout.
- `POST /api/stripe-portal`: subscription management.
- `POST /api/stripe-webhook`: verified server-side reconciliation.
- `/billing` and `/pricing`: existing browser purchase/management experience.

Hebri's inherited `/api/billing/state`, charge, auto-reload and subscription
mutation payloads are not aliases of these routes. Keep Nous provider billing
separate where supported. The initial Synapsek account UI should show
server-owned account/plan/usage information and open the existing website in
the system browser for purchases. A browser return is not proof of payment:
refresh server state after verified webhook reconciliation. Use immutable
user IDs and checked workspace membership, not email matching or local
profile names, to select the billing subject.

## Paid inference is a separate integration gate

### Native session approval

The staging issuer creates native OAuth sessions at `aal1` even when browser
consent followed MFA. The desktop therefore requests a separate, one-time
session binding after token exchange. A random 256-bit challenge opens only the
configured Synapsek origin, with no access or refresh token in the URL. The
server binds its hash to the verified user, client and issuer session; the same
browser user explicitly approves with MFA when enrolled. Pending requests expire
after five minutes, approved bindings after 30 days, and authenticator changes
or revocation invalidate them. The desktop polls only while pending and saves
the encrypted refresh credential only after the account endpoint accepts the
binding. Failure attempts server revocation. This does not rewrite JWT claims
or give native tokens access to website, workspace or provider credentials.

Deploy with Synapsek's `desktop_account_binding.sql` and matching API. The native
regression includes real HTTP pending/approved/denied transitions, alongside the
existing real callback, encrypted file and account-switching tests. Live staging
qualification is still required before release.

A paid-plan badge does not make local Hebri model calls use Synapsek credits.
The inspected provider registry has no Synapsek managed-inference adapter.
Add that adapter and an authenticated server gateway which reuses Synapsek's
existing model policy and usage ledger. Every model/tool iteration needs a
bounded budget, reservation, measured settlement and idempotency; a client
cannot report its own charge as authoritative. Concurrent website and desktop
requests must consume the same applicable account/workspace budget.

Keep shared provider keys on the server. A local open-source desktop cannot
securely enforce paid service access by hiding buttons. Locally supplied
provider keys and purely local tools are distinct from Synapsek-funded usage;
make that distinction clear in product policy and UI.

## Review evidence and references

Review evidence: on 0.17.10, 107 focused Electron-independent auth and package
validation tests passed in 11 files using the existing workspace Vitest 4.1.11.
They cover PKCE/callback logic, token storage, refresh coordination, portal
origin/cookies, remote ticket/request logic and renderer-bundle validation.
This is not a full Electron build, OS-keychain test, real native Synapsek
login, Stripe payment test or end-to-end billing qualification.

The implementation adds 11 native-account tests (including a real loopback
listener and temporary encrypted files) and two rendered account-panel tests.
All 120 focused desktop tests pass. Renderer and Electron TypeScript checks,
the renderer production build and main/preload bundles pass. New account files
pass ESLint. The Synapsek full suite initially found one consent-route 404
regression; after correcting the Vercel allowlist its two route tests pass.
The other 2,185 tests passed in that full run, with seven skipped. The database
boundary tests execute the actual SQL twice in PGlite and verify website/native/
server access, writes, cross-user rows, the RPC predicate and fail-closed handling
of a newly exposed table without RLS. Real staging qualification remains pending.

References:

- [Supabase OAuth server setup and public clients](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
- [Supabase OAuth flows and token claims](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
- [OAuth token security and RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security)
- [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
