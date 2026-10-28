#!/usr/bin/env bash
# Run `scripts/gen-screenshots.mjs` inside an isolated Playwright container
# (Colima / Docker locally), set up the same way as .github/workflows/screenshots.yml:
#   - the Playwright image pinned by digest (keep in step with that workflow)
#   - Bun pinned and checksum-verified from this repo's mise.lock
#   - the Playwright JS client matching the image, installed through the
#     registry proxy in .npmrc
#
# Mounts:
#   - stuffbucket/maximal-site at /work/maximal-site (rw for public/screenshots and src/data)
#   - stuffbucket/maximal      at /work/maximal      (rw so `bun run build:ui` can emit shell/dist/ui)
#
# Zero host credentials, tokens, or ~/.local/share/maximal state are mounted.
# The container is removed when it exits (--rm) and labelled per
# ~/Claude/docker-optimize/CONVENTIONS.md (project + class=scratch).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MAXIMAL_ROOT="${MAXIMAL_DIR:-$(cd "${SITE_ROOT}/../maximal" && pwd)}"

# mcr.microsoft.com/playwright:v1.52.0-noble
PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright@sha256:a021500a801bab0611049217ffad6b9697d827205c15babb86a53bc1a61c02d5}"
PLAYWRIGHT_CLIENT="playwright@1.52.0"

if [[ ! -f "${MAXIMAL_ROOT}/scripts/ui-harness.ts" ]]; then
  echo "✗ Could not find stuffbucket/maximal at ${MAXIMAL_ROOT}" >&2
  echo "  Set MAXIMAL_DIR=/path/to/maximal and try again." >&2
  exit 1
fi

# Bun's Linux download URL and checksum for one platform, from mise.lock.
bun_lock() {
  awk -v section="[tools.bun.\"platforms.$1\"]" -v key="$2" '
    $0 == section { inside = 1; next }
    /^\[/ { inside = 0 }
    inside && $1 == key { gsub(/"/, "", $3); sub(/^sha256:/, "", $3); print $3; exit }
  ' "${SITE_ROOT}/mise.lock"
}
BUN_VERSION="$(awk '/^\[\[tools.bun\]\]/ { getline; gsub(/"/, "", $3); print $3; exit }' "${SITE_ROOT}/mise.lock")"
MAXIMAL_BUN="$(cat "${MAXIMAL_ROOT}/.bun-version" 2>/dev/null || true)"
if [[ -n "${MAXIMAL_BUN}" && "${MAXIMAL_BUN}" != "${BUN_VERSION}" ]]; then
  echo "! maximal pins Bun ${MAXIMAL_BUN}; this repo's mise.lock has ${BUN_VERSION}. The harness runs on ${BUN_VERSION}." >&2
fi

# Build the UI bundle on the host if bun is available (takes ~50ms); otherwise inside the container.
if command -v bun >/dev/null 2>&1; then
  echo "==> Building Maximal UI bundle (shell/dist/ui)..."
  (cd "${MAXIMAL_ROOT}" && bun run build:ui)
fi

echo "==> Running isolated screenshot generator in Docker (${PLAYWRIGHT_IMAGE})..."
docker run --rm --ipc=host --user root \
  --label io.stuffbucket.project=maximal-site \
  --label io.stuffbucket.class=scratch \
  --label "io.stuffbucket.created-by=${USER:-unknown}" \
  -v "${SITE_ROOT}:/work/maximal-site" \
  -v "${MAXIMAL_ROOT}:/work/maximal" \
  -w /work/maximal-site \
  -e HOME=/tmp/clean-home \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  -e NODE_PATH=/tmp/pw-runner/node_modules \
  -e MAXIMAL_DIR=/work/maximal \
  -e SHOTS_ONLY="${SHOTS_ONLY:-}" \
  -e PLAYWRIGHT_CLIENT="${PLAYWRIGHT_CLIENT}" \
  -e BUN_URL_ARM64="$(bun_lock linux-arm64 url)" \
  -e BUN_SHA256_ARM64="$(bun_lock linux-arm64 checksum)" \
  -e BUN_URL_X64="$(bun_lock linux-x64 url)" \
  -e BUN_SHA256_X64="$(bun_lock linux-x64 checksum)" \
  "${PLAYWRIGHT_IMAGE}" \
  bash -c '
    set -euo pipefail
    mkdir -p "$HOME"

    echo "==> Installing Bun (pinned, checksum-verified)..."
    case "$(uname -m)" in
      aarch64) url="$BUN_URL_ARM64" sum="$BUN_SHA256_ARM64" ;;
      x86_64)  url="$BUN_URL_X64"   sum="$BUN_SHA256_X64" ;;
      *) echo "✗ unsupported architecture $(uname -m)" >&2; exit 1 ;;
    esac
    curl -fsSL "$url" -o /tmp/bun.zip
    echo "$sum  /tmp/bun.zip" | sha256sum -c --quiet -
    # The image has no unzip; Python does.
    python3 -c "import zipfile; zipfile.ZipFile(\"/tmp/bun.zip\").extractall(\"/tmp/bun\")"
    bun_bin="$(find /tmp/bun -type f -name bun | head -n 1)"
    chmod +x "$bun_bin"
    export PATH="$(dirname "$bun_bin"):$PATH"

    echo "==> Installing the Playwright client ($PLAYWRIGHT_CLIENT) through the registry proxy..."
    mkdir -p /tmp/pw-runner
    cp /work/maximal-site/.npmrc /tmp/pw-runner/.npmrc
    (cd /tmp/pw-runner && npm init -y >/dev/null 2>&1 \
      && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --ignore-scripts --no-audit --no-fund "$PLAYWRIGHT_CLIENT" >/dev/null)

    if [[ ! -f /work/maximal/shell/dist/ui/settings/index.html ]]; then
      echo "==> Building Maximal UI bundle inside container..."
      (cd /work/maximal && bun install --frozen-lockfile --ignore-scripts && (cd shell && bun install --frozen-lockfile --ignore-scripts) && bun run build:ui)
    fi
    echo "==> Capturing screenshots via Playwright..."
    node /work/maximal-site/scripts/gen-screenshots.mjs
  '
