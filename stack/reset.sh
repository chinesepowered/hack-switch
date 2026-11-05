#!/usr/bin/env bash
# Wipe the local CapyTales stack back to empty: stops the agent controller,
# deletes the Switch and Mattermost data volumes, the controller's enrollment
# and the agents' working folders. Keeps stack/.env (accounts and secrets).
# Run ./stack/start.sh afterwards for a fresh server.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
pkill -f "switch-agent-controller run" 2>/dev/null || true
docker compose -f "$HERE/switch-compose.yml" --env-file "$HERE/.env" --project-name capytales \
  --profile collab --profile gateway down -v
rm -rf "$HERE/controller" "$HERE/logs"
rm -rf "${HOME}/.switch/agents/127.0.0.1-8000"
echo "Reset. Run ./stack/start.sh to start fresh."
