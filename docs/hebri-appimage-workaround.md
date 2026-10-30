# Hebri AppImage: persistent extraction workaround

This opt-in workaround for [#34](https://github.com/satoshilove/hebri/issues/34)
runs Hebri from persistent extracted files, avoiding temporary executable mounts.
It is **not a verified root-cause fix**. Normal installations are unchanged.

## Install

Use a trusted AppImage and an existing shell launcher with one standalone
`exec /absolute/path/to/Hebri.AppImage "$@"` (quoted paths are supported).
Python 3.11+, Linux, `sh`, and `bash` are required. Run as the installation owner,
without `sudo`.

```sh
python3 scripts/hebri_appimage_workaround.py install \
  /absolute/path/to/Hebri.AppImage \
  /absolute/path/to/hebri-desktop \
  /absolute/path/to/hebri-persistent
```

The destination must be new. The script preserves launcher environment settings
and arguments, backs up the launcher as `.before-crashpad-workaround`, and saves
an installation receipt as `.crashpad-workaround-installed`. It refuses existing
installations/backups and unrecognized launchers. Running sessions are unchanged.

## Updates

The installation contains a private, versionless `Hebri.AppImage` copy, a
`runner.py`, and persistent `files-<sha256>` directories. Every normal launcher
invocation hashes the stable image and extracts changed contents before starting
`AppRun`. The runner exports `APPIMAGE` pointing to that stable image and clears
inherited `APPDIR` and install-only flags. This enables the AppImage updater while
keeping executable files persistent. Extraction failure fails the launch; it
never silently falls back to an older extracted version. Old extractions remain
available to processes still using them.

Hebri 0.17.20 downloads only after **Update now**, installs on a normal quit, and
asks the user to reopen the app. Its bundled electron-updater preserves a
versionless image filename during replacement. Reopen through the same repaired
launcher so the new image is extracted and selected. Do not start an old
`files-*/AppRun` directly. A downloaded update is not installed until Hebri quits
normally. Other updater versions and forced automatic relaunch paths require
separate validation; this script does not change application relaunch internals.

The original input AppImage is retained and is no longer the update target.
There is no automatic cache cleanup: removing files while helpers use them could
reintroduce the suspected shutdown problem. Allow disk space for the stable
image, a temporary extraction image, and old/new extracted releases.

## Verify

Quit normally after saving work, then reopen through the launcher. Check About
for the installed version and a successful GitHub update check. After an update,
quit normally and reopen through the launcher again; verify the new version.
Repeat launch/exit cycles and check for new Crashpad crashes before claiming the
suspected shutdown race is fixed.

Two CLI contract tests exercise real fixture extraction/launch, arguments and
environment, replacement-image selection, failure without stale fallback,
overwrite protection, and guarded rollback. A separate local validation used the
bundled 0.17.20 updater for a real GitHub check and its actual installation method
against disposable fixture images. A future real-release download/install and
crash-prevention check remain required; fixtures do not prove those outcomes.

## Roll back

```sh
python3 scripts/hebri_appimage_workaround.py rollback /absolute/path/to/hebri-desktop
```

Rollback restores the original launcher, including its original release target;
review that version if the stable image has since updated. It refuses later
launcher edits and retains the backup, receipt, and all installation files.
Never delete extracted files while application/helper processes use them.

For an earlier fixed-directory version of this workaround, review and restore
its original launcher first, archive its backup/receipt, then install this
version into a new destination. Keep old extracted files until no process uses
them. Profile data and settings do not need migration.
