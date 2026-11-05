#!/usr/bin/env bash
# One command to bring CapyTales back after a reboot: Docker, the Switch stack,
# the demo family, and the agent controller that runs the capybaras.
#
#   ./stack/start.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
LOGS="$HERE/logs"
mkdir -p "$LOGS"

# 1. Docker daemon (cloud containers start without one).
if ! docker info >/dev/null 2>&1; then
  if command -v dockerd >/dev/null; then
    echo "Starting dockerd..."
    nohup dockerd > "$LOGS/dockerd.log" 2>&1 &
    for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
  fi
  docker info >/dev/null 2>&1 || { echo "Docker is not running." >&2; exit 1; }
fi

# 2. Switch + Mattermost + gateway.
"$HERE/up.sh"

# 3. Demo family accounts (idempotent).
"$HERE/family.sh"

# 4. The capytales command the capybaras use (this repo's own tools).
if ! command -v capytales >/dev/null; then
  chmod +x "$HERE/../tools/capytales.mjs"
  ln -sf "$HERE/../tools/capytales.mjs" /usr/local/bin/capytales
fi

# 5. The agent controller (enrolls this machine the first time).
"$HERE/controller.sh"
