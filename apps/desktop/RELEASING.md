# Test before publishing

Windows development builds do not need a public GitHub release. From a clean
checkout with root dependencies installed, run:

```powershell
cd apps/desktop
npm run dist:win -- --publish never
$env:HERMES_DESKTOP_SKIP_BUILD = '1'
npm run test:desktop:all
# Select a prepared Python runtime if the checkout has no .venv or venv:
$env:HERMES_DESKTOP_PYTHON = 'C:\path\to\hebri-runtime\Scripts\python.exe'
npm run preview:local
```

The candidate is in `release/win-unpacked/Hebri.exe`; installers are in
`release/`. A local build is unsigned unless signing was explicitly configured.
Do not weaken the production updater's signature checks to install it.

The preview command creates a fresh test home, Electron user-data directory and
isolated backend. It does not register the production URL handler or inherit
provider credentials. A prepared Python runtime is reused as executable code;
its normal user profile is not loaded. Do not sign into real accounts just to
check layout. Launching an NSIS installer on a
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
4. Inspect the installer visual-evidence artifact: CI requires a visible native
   progress control and Finish screen, captures both, and then checks the
   installed version and preserved application data. Also exercise the app's
   download and quit actions; installer screenshots alone do not cover those.
5. Publish the verified draft (`gh release edit vX.Y.Z --draft=false --latest`).
   Check the published release and feeds once more.

For changes to backend installation, also rehearse with a disposable copy of an
older desktop-managed `hebri-agent` tree, including its Git metadata, venv and
bootstrap marker. A fresh checkout preview bypasses this path. Start the packaged
candidate with an isolated home and user-data directory, without a source-root
override. Verify visible installer progress, the updated marker, preservation of
profile data and source backups, and a successful Devices status request. Check
that a failed update can be retried and that an active backend blocks replacement.

Mac packaging/signing needs a Mac runner; a local Windows build cannot validate
it. Keep the cross-platform CI gates even when local checks pass.
