"""CLI contracts for the opt-in workaround described in Hebri issue #34."""
import os
from pathlib import Path
import shlex
import subprocess
import sys

import pytest


SCRIPT = Path(__file__).resolve().parents[3] / 'scripts/hebri_appimage_workaround.py'


def command(*args):
    return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)],
                          capture_output=True, text=True, timeout=15)


@pytest.fixture
def installation(tmp_path):
    image = tmp_path / 'Trusted fixture.AppImage'
    image.write_text('''#!/bin/sh
set -eu
test "$1" = --appimage-extract
mkdir squashfs-root
cat > squashfs-root/AppRun <<'APP'
#!/bin/sh
printf '%s\\n' "$PROFILE_FIXTURE" "${APPIMAGE-unset}" "${APPDIR-unset}" "$@"
APP
cp squashfs-root/AppRun squashfs-root/Hebri
cp squashfs-root/AppRun squashfs-root/chrome_crashpad_handler
chmod +x squashfs-root/*
''', encoding='utf-8')
    image.chmod(0o755)
    launcher = tmp_path / 'launcher'
    original = ('#!/bin/sh\nexport PROFILE_FIXTURE=preserved\n'
                f'exec {shlex.quote(str(image))} "$@"\n')
    launcher.write_text(original, encoding='utf-8')
    launcher.chmod(0o755)
    return image, launcher, tmp_path / 'persistent files', original


@pytest.mark.linux_only
def test_install_preserves_launch_contract_and_rollback(installation):
    image, launcher, destination, original = installation
    result = command('install', image, launcher, destination)
    assert result.returncode == 0, result.stderr
    env = {**os.environ, 'APPIMAGE': '/stale/image', 'APPDIR': '/stale/mount'}
    launched = subprocess.run([str(launcher), 'argument with spaces', ''],
                              env=env, capture_output=True, text=True, timeout=15)
    assert launched.returncode == 0, launched.stderr
    assert launched.stdout.splitlines() == ['preserved', str(destination / 'Hebri.AppImage'), 'unset', 'argument with spaces', '']
    old_files = list(destination.glob('files-*'))
    # Model the updater replacing its stable image, then a normal user relaunch.
    stable = destination / 'Hebri.AppImage'
    stable.write_text(image.read_text().replace('"$PROFILE_FIXTURE"', '"updated:$PROFILE_FIXTURE"'))
    launched = subprocess.run([str(launcher), 'new argument'], env=env,
                              capture_output=True, text=True, timeout=15)
    assert launched.returncode == 0, launched.stderr
    assert launched.stdout.splitlines() == ['updated:preserved', str(stable), 'unset', 'new argument']
    assert len(list(destination.glob('files-*'))) == 2
    assert old_files[0].is_dir()  # Running helpers may still use the previous files.
    stable.write_text('#!/bin/sh\nexit 1\n')
    failed = subprocess.run([str(launcher)], capture_output=True, text=True, timeout=15)
    assert failed.returncode != 0
    assert 'refusing to launch an older release' in failed.stderr
    result = command('rollback', launcher)
    assert result.returncode == 0, result.stderr
    assert launcher.read_text(encoding='utf-8') == original
    assert os.access(launcher, os.X_OK)
    assert (old_files[0] / 'chrome_crashpad_handler').is_file()


@pytest.mark.linux_only
def test_refuses_to_overwrite_installation_or_later_launcher_edits(installation):
    image, launcher, destination, _ = installation
    result = command('install', image, launcher, destination)
    assert result.returncode == 0, result.stderr
    installed = launcher.read_bytes()
    assert command('install', image, launcher, destination).returncode != 0
    assert launcher.read_bytes() == installed
    edited = installed + b'# subsequent user change\n'
    launcher.write_bytes(edited)
    assert command('rollback', launcher).returncode != 0
    assert launcher.read_bytes() == edited
