#!/usr/bin/env python3
"""Install or roll back a persistent-extraction workaround for Hebri AppImage."""
import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile


def replace_atomically(path, data, mode):
    fd, name = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
        os.chmod(name, mode)
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def replacement(original, image, destination):
    # Deliberately accept only a standalone exec of this exact AppImage.
    matches = []
    lines = original.splitlines(keepends=True)
    for index, line in enumerate(lines):
        if not line.lstrip().startswith('exec '):
            continue
        try:
            words = shlex.split(line)
        except ValueError:
            continue
        if words == ['exec', str(image), '$@'] and line.rstrip().endswith('"$@"'):
            matches.append(index)
    if len(matches) != 1:
        raise ValueError('Expected exactly one standalone exec of the supplied AppImage with "$@"; launcher left unchanged.')
    lines[matches[0]] = (
        '# Refresh persistent files when the updater replaces the stable AppImage.\n'
        f'exec python3 {shlex.quote(str(destination / "runner.py"))} launch '
        f'{shlex.quote(str(destination))} -- "$@"\n'
    )
    return ''.join(lines)


def install(image, launcher, destination):
    backup = launcher.with_name(launcher.name + '.before-crashpad-workaround')
    receipt = launcher.with_name(launcher.name + '.crashpad-workaround-installed')
    if destination.exists() or backup.exists() or receipt.exists():
        raise ValueError('Installation directory or backup already exists. Refusing to overwrite it.')
    original = launcher.read_bytes()
    updated = replacement(original.decode(), image, destination).encode()
    subprocess.run(['sh', '-n'], input=updated, check=True)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.hebri-extract-', dir=destination.parent) as stage:
        root = Path(stage) / 'installation'
        root.mkdir()
        # A versionless name keeps electron-updater's replacement at this path.
        shutil.copy2(image, root / 'Hebri.AppImage')
        shutil.copy2(Path(__file__), root / 'runner.py')
        prepare(root)
        if launcher.read_bytes() != original:
            raise ValueError('Launcher changed during extraction; refusing to overwrite it.')
        mode = launcher.stat().st_mode & 0o777
        with backup.open('xb') as stream:
            stream.write(original)
        os.chmod(backup, mode)
        with receipt.open('xb') as stream:
            stream.write(updated)
        root.rename(destination)
        replace_atomically(launcher, updated, mode)
    print(f'Installed. Future launches use {destination / "runner.py"}')
    print(f'Original launcher saved at {backup}')
    print('Running sessions were not restarted. Crash prevention still requires a launch/exit check.')


def prepare(directory):
    image = directory / 'Hebri.AppImage'
    # Serialize extractions, but never hold the lock for the app's lifetime.
    with (directory / '.extract.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        with image.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        target = directory / ('files-' + digest)
        if target.exists():
            if not (target / '.complete').is_file():
                raise ValueError('Incomplete persistent extraction; refusing to launch.')
            return target
        with tempfile.TemporaryDirectory(prefix='.extract-', dir=directory) as stage:
            # Snapshot the image so a concurrent updater cannot change extraction input.
            snapshot = Path(stage) / 'Hebri.AppImage'
            shutil.copy2(image, snapshot)
            with snapshot.open('rb') as stream:
                if hashlib.file_digest(stream, 'sha256').hexdigest() != digest:
                    raise ValueError('AppImage changed during preparation; retry launch.')
            env = dict(os.environ)
            for key in ('APPIMAGE', 'APPDIR', 'APPIMAGE_EXIT_AFTER_INSTALL', 'APPIMAGE_SILENT_INSTALL'):
                env.pop(key, None)
            result = subprocess.run([str(snapshot), '--appimage-extract'], cwd=stage,
                                    env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            if result.returncode:
                raise ValueError('AppImage extraction failed; refusing to launch an older release.')
            root = Path(stage) / 'squashfs-root'
            for name in ('AppRun', 'Hebri', 'chrome_crashpad_handler'):
                if not (root / name).is_file() or not os.access(root / name, os.X_OK):
                    raise ValueError(f'Extracted executable is missing: {name}')
            subprocess.run(['bash', '-n', str(root / 'AppRun')], check=True)
            (root / '.complete').touch()
            root.rename(target)
        return target


def launch(directory, arguments):
    target = prepare(directory)
    env = dict(os.environ)
    for key in ('APPDIR', 'APPIMAGE_EXIT_AFTER_INSTALL', 'APPIMAGE_SILENT_INSTALL'):
        env.pop(key, None)
    env['APPIMAGE'] = str(directory / 'Hebri.AppImage')
    os.execve(target / 'AppRun', [str(target / 'AppRun'), *arguments], env)


def rollback(launcher):
    backup = launcher.with_name(launcher.name + '.before-crashpad-workaround')
    receipt = launcher.with_name(launcher.name + '.crashpad-workaround-installed')
    if not receipt.exists():
        raise ValueError('No receipt from this script. Restore the existing backup manually after reviewing the launcher.')
    if launcher.read_bytes() != receipt.read_bytes():
        raise ValueError('Launcher has changed since installation; refusing to overwrite later edits.')
    subprocess.run(['sh', '-n', str(backup)], check=True)
    replace_atomically(launcher, backup.read_bytes(), backup.stat().st_mode & 0o777)
    print('Original launcher restored. Backup, receipt, and extracted files retained.')
    print('Do not delete extracted files while any application/helper process uses them.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    setup = commands.add_parser('install', help='Use only with a trusted AppImage')
    setup.add_argument('image', type=Path)
    setup.add_argument('launcher', type=Path)
    setup.add_argument('destination', type=Path)
    run = commands.add_parser('launch', help='Launch the current stable image from persistent files')
    run.add_argument('directory', type=Path)
    run.add_argument('arguments', nargs=argparse.REMAINDER)
    undo = commands.add_parser('rollback')
    undo.add_argument('launcher', type=Path)
    args = parser.parse_args()
    if args.command == 'launch':
        try:
            launch(args.directory.expanduser().absolute(), args.arguments)
        except (OSError, ValueError, subprocess.CalledProcessError) as error:
            parser.exit(1, f'Error: {error}\n')
        return
    launcher = args.launcher.expanduser().absolute()
    if launcher.is_symlink():
        parser.error('Use the actual launcher file, not a symlink.')
    try:
        if args.command == 'install':
            install(args.image.expanduser().resolve(strict=True), launcher,
                    args.destination.expanduser().absolute())
        else:
            rollback(launcher)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Error: {error}\n')


if __name__ == '__main__':
    main()
