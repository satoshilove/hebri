# Hebri

<p align="center">
  <strong>Desktop AI workspaces for people and agents, by Synapsek Labs.</strong>
</p>

<p align="center">
  <a href="https://github.com/satoshilove/hebri/releases">Downloads</a> ·
  <a href="https://github.com/satoshilove/hebri/issues">Issues</a> ·
  <a href="https://synapseklabs.org">Synapsek Labs</a>
</p>

Hebri combines a native desktop agent, a separate human Team workspace, managed bots, messaging gateways, browser and computer tools, memory, skills, and remote workspaces. Humans own Team messages and board state; bots can receive a bounded read-only snapshot so their work follows the team without impersonating a teammate or mutating human state.

## Install

Download the package for your platform from [GitHub Releases](https://github.com/satoshilove/hebri/releases):

- Windows: `.exe` installer for the normal guided setup, or `.msi` for managed and enterprise deployment.
- Omarchy and other Arch-based Linux: use the AppImage, or install the CLI from source and run `hebri desktop`.
- Debian/Ubuntu: `.deb` or AppImage.
- Fedora/RHEL: `.rpm` or AppImage.
- macOS: `.dmg` or `.zip`, with separate Apple Silicon and Intel builds when published.

Windows and macOS builds remain unsigned until Synapsek Labs configures platform signing. Testers should verify the SHA-256 checksum published with the release and expect the operating system's normal unsigned-app warning.

### Source install

```bash
git clone https://github.com/satoshilove/hebri.git
cd hebri
./scripts/install.sh
hebri
```

Windows PowerShell:

```powershell
git clone https://github.com/satoshilove/hebri.git
Set-Location hebri
.\scripts\install.ps1
hebri
```

The legacy `hermes` command and `HERMES_*` environment variables are retained as compatibility interfaces for existing automations and upstream plugins. New user-facing instructions should use `hebri`.

## Desktop

Launch the desktop app from the installed application menu or run:

```bash
hebri desktop
```

Desktop supports:

- local, remote, SSH, and future Hebri Cloud gateway modes;
- sessions, projects, worktrees, terminals, artifacts, web previews, and computer-use permissions;
- a human Team workspace that remains separate from bot/agent conversations;
- Windows, Linux, Omarchy, and macOS release packages;
- GitHub Release update checks through the official `satoshilove/hebri` repository.

See [the desktop guide](apps/desktop/README.md) for architecture, development, packaging, and troubleshooting.

## Synapsek accounts and billing

Hebri is designed to use Synapsek accounts as the identity authority and Synapsek's server-side Stripe integration as the billing authority. Native account sign-in is not considered production-ready until the portal exposes and verifies a public-client PKCE/device authorization contract, token refresh and revocation, issuer/JWKS discovery, and a server-owned entitlement endpoint.

The implementation and rollout checklist is in [Synapsek account and billing integration](docs/SYNAPSEK_ACCOUNT_AND_BILLING_INTEGRATION.md). Do not embed Supabase service keys, Stripe secret keys, or webhook secrets in the desktop app.

## Development

```bash
npm install
npm --workspace apps/desktop run typecheck
npm --workspace apps/desktop run lint
npm --workspace apps/desktop run test:desktop:all
```

The Python test entry point is:

```bash
scripts/run_tests.sh
```

## Security

- Report vulnerabilities privately to the Synapsek Labs maintainers before opening a public issue.
- Keep secrets in the operating-system keychain or server-side secret stores; never commit them.
- Treat gateway URLs, OAuth issuers, update feeds, and release artifacts as trust boundaries.
- Diagnostics stay local by default in Hebri. Review redacted output before sharing it.
- Production releases require passing CI, clean dependency/security scans, staged identity and billing tests, and signed/notarized packages when signing is enabled.

## License and attribution

Hebri remains MIT licensed. It is derived from the original MIT-licensed [Hermes Agent](https://github.com/NousResearch/hermes-agent). Required copyright and upstream attribution are preserved in [LICENSE](LICENSE) and [NOTICE](NOTICE); those legal references are intentionally not rebranded.
