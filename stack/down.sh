#!/usr/bin/env bash
# Stop the CapyTales Switch stack, keeping its data volumes.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
docker compose -f "$HERE/switch-compose.yml" --env-file "$HERE/.env" --project-name capytales \
  --profile collab --profile gateway down
