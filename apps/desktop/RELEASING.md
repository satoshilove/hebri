# Test before publishing

Windows development builds do not need a public GitHub release. From a clean
checkout with root dependencies installed, run:

```powershell
cd apps/desktop
npm run dist:win -- --publish never
$env:HERMES_DESKTOP_SKIP_BUILD = '1'
npm run test:desktop:all
```

The candidate is in `release/win-unpacked/Hebri.exe`; installers are in
`release/`. A local build is unsigned unless signing was explicitly configured.
Do not weaken the production updater's signature checks to install it.

For interface testing, launch the unpacked candidate using a fresh test home,
Electron user-data directory and isolated backend (the E2E fixtures in
`e2e/fixtures.ts` set these together). Do not point a test build at an existing
user's account, browser storage or agent data. Launching an NSIS installer on a
developer machine can change the real installation and shortcuts even when an
alternate destination is selected; use a disposable Windows VM for installation.

Before publishing:

1. Bump the desktop package version and matching workspace lock entry. Test the
   candidate locally and merge the release preparation through a PR.
2. Tag the reviewed commit. CI builds all platforms, signs release packages,
   validates packages and rehearses the Windows payload upgrade on a disposable
   runner. `scripts/ci/test_windows_desktop_upgrade.ps1` accepts `-PreviousVersion`;
   keep its default aligned with the currently published stable release.
3. The workflow uploads a **draft** release. It is not the public update feed.
   Check installer signatures, checksums, all platform assets and merged Mac feed.
4. Rehearse the visible update/installer flow in a disposable Windows VM. The
   unattended CI payload test does not prove that installer progress is visible.
5. Publish the verified draft (`gh release edit vX.Y.Z --draft=false --latest`).
   Check the published release and feeds once more.

Mac packaging/signing needs a Mac runner; a local Windows build cannot validate
it. Keep the cross-platform CI gates even when local checks pass.
