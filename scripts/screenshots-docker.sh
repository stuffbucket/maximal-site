#!/usr/bin/env bash
# Run `scripts/gen-screenshots.mjs` inside an isolated Playwright + Bun container
# (using Colima / Docker locally or in CI).
#
# Mounts:
#   - stuffbucket/maximal-site at /work/maximal-site (rw for public/screenshots)
#   - stuffbucket/maximal      at /work/maximal      (rw so `bun run build:ui` can emit shell/dist/ui)
#
# Zero host credentials, tokens, or ~/.local/share/maximal state are mounted.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MAXIMAL_ROOT="${MAXIMAL_DIR:-$(cd "${SITE_ROOT}/../maximal" && pwd)}"

if [[ -z "${PLAYWRIGHT_IMAGE:-}" ]]; then
  if docker image inspect pipedf-playwright:latest >/dev/null 2>&1; then
    PLAYWRIGHT_IMAGE="pipedf-playwright:latest"
  else
    PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.52.0-noble"
  fi
fi

if [[ ! -f "${MAXIMAL_ROOT}/scripts/ui-harness.ts" ]]; then
  echo "✗ Could not find stuffbucket/maximal at ${MAXIMAL_ROOT}" >&2
  echo "  Set MAXIMAL_DIR=/path/to/maximal and try again." >&2
  exit 1
fi

# Build the UI bundle on host if bun is available (takes ~50ms), otherwise inside the container
if command -v bun >/dev/null 2>&1; then
  echo "==> Building Maximal UI bundle (shell/dist/ui)..."
  (cd "${MAXIMAL_ROOT}" && bun run build:ui)
fi

echo "==> Running isolated screenshot generator in Docker (${PLAYWRIGHT_IMAGE})..."
docker run --rm --ipc=host --user root \
  -v "${SITE_ROOT}:/work/maximal-site" \
  -v "${MAXIMAL_ROOT}:/work/maximal" \
  -w /work/maximal-site \
  -e HOME=/tmp/clean-home \
  -e PLAYWRIGHT_BROWSERS_PATH=/home/pipedf/.cache/ms-playwright \
  -e MAXIMAL_DIR=/work/maximal \
  -e SHOTS_ONLY="${SHOTS_ONLY:-}" \
  "${PLAYWRIGHT_IMAGE}" \
  bash -c '
    set -euo pipefail
    mkdir -p "$HOME"
    if [[ ! -d /home/pipedf/.cache/ms-playwright ]] && [[ -d /ms-playwright ]]; then
      export PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
    fi
    if ! command -v bun >/dev/null 2>&1; then
      echo "==> Installing Bun inside container..."
      curl -fsSL https://bun.sh/install | bash >/dev/null
      export PATH="$HOME/.bun/bin:$PATH"
    fi
    if [[ ! -f /work/maximal/shell/dist/ui/settings/index.html ]]; then
      echo "==> Building Maximal UI bundle inside container..."
      (cd /work/maximal && bun install --frozen-lockfile --ignore-scripts && (cd shell && bun install --frozen-lockfile --ignore-scripts) && bun run build:ui)
    fi
    echo "==> Capturing screenshots via Playwright..."
    node /work/maximal-site/scripts/gen-screenshots.mjs
  '
