/**
 * Stages the Hebri agent source tree (runtime subset) into
 * apps/desktop/build/hebri-source/ so electron-builder can ship it as an
 * extraResource (build/hebri-source -> resources/hebri-source).
 *
 * Why: the packaged desktop app installs the agent from this bundled tree
 * (install.ps1 -SourceDir / install.sh --source-dir) instead of cloning from
 * GitHub. Builds stamped to locally-committed (unpushed) SHAs 404 on every
 * network path, and offline first-launch must work too. The bundled tree is
 * therefore the source of truth for the installed agent.
 *
 * Excluded: dev-only trees (tests/, website/, evals/), VCS metadata, and
 * build artifacts (node_modules, __pycache__, .venv, apps/desktop/{dist,
 * build,release}). Everything the installed agent needs at runtime ships.
 *
 * NOTE: Node's fs.cpSync refuses to copy a directory into a subdirectory of
 * itself (the output lives inside the repo), so this uses an explicit
 * recursive walk instead.
 */

import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";

const DESKTOP_ROOT = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(DESKTOP_ROOT, "..", "..");
const OUT_DIR = resolve(DESKTOP_ROOT, "build", "hebri-source");

// Top-level entries that are dev-only or build artifacts — never ship.
const EXCLUDE_TOP = new Set([
  "tests",
  "website",
  "evals",
  "node_modules",
  ".venv",
  "__pycache__",
  ".pytest_cache",
  ".git",
  "release2",
]);

// Directory names skipped anywhere in the tree.
const EXCLUDE_DIRS = new Set(["node_modules", "__pycache__", ".pytest_cache", ".venv", ".git"]);

// apps/desktop-specific build artifacts (the packaged app already ships its
// own renderer; the installed agent rebuilds on demand if ever needed).
const DESKTOP_EXCLUDE = new Set(["dist", "build", "release"]);

function isExcluded(relParts) {
  if (EXCLUDE_TOP.has(relParts[0])) {
    return true
  }

  if (
    relParts[0] === "apps" &&
    relParts[1] === "desktop" &&
    relParts.length > 2 &&
    DESKTOP_EXCLUDE.has(relParts[2])
  ) {
    return true
  }

  return EXCLUDE_DIRS.has(relParts[relParts.length - 1])
}

// Recreate the output dir fresh so stale files from a previous stage cannot
// leak into the package.
rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(OUT_DIR, { recursive: true })

let fileCount = 0
let totalBytes = 0

function copyDir(srcDir, destDir, relPrefix) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const relParts = [...relPrefix, entry.name]
    if (isExcluded(relParts)) {
      continue
    }

    const srcPath = srcDir + sep + entry.name
    const destPath = destDir + sep + entry.name

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true })
      copyDir(srcPath, destPath, relParts)
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      cpSync(srcPath, destPath)
      try {
        const st = statSync(srcPath)
        fileCount += 1
        totalBytes += st.size
      } catch {
        fileCount += 1
      }
    }
  }
}

const started = Date.now()
copyDir(REPO_ROOT, OUT_DIR, [])

// Sanity: the installer entrypoints and Python project must have made it.
for (const rel of ["scripts/install.ps1", "scripts/install.sh", "pyproject.toml", "cli.py"]) {
  const p = OUT_DIR + sep + rel.replace(/\//g, sep)

  if (!statSync(p).isFile()) {
    throw new Error(`stage-bundle: expected ${p} after copy; bundle is incomplete`)
  }
}

console.log(
  `[stage-bundle] staged ${fileCount} files, ${(totalBytes / 1048576).toFixed(1)} MB -> ${OUT_DIR} in ${Date.now() - started}ms`
)
