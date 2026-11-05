#!/usr/bin/env bash
# Give each capybara its picture on its Mattermost bot account.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
MM="${MM_URL:-http://127.0.0.1:8065}"
FAMILY="${1:-capy}"
# shellcheck disable=SC1091
set -a; . "$HERE/.env"; set +a

TOKEN=$(curl -fsS -i -X POST "$MM/api/v4/users/login" -H 'Content-Type: application/json' \
  -d "{\"login_id\":\"$MATTERMOST_ADMIN_USER\",\"password\":\"$MATTERMOST_ADMIN_PASSWORD\"}" | awk -F': ' 'tolower($1)=="token"{print $2}' | tr -d '\r')
for name in mochi pebble yuzu tofu; do
  id=""
  for _ in $(seq 1 20); do
    id=$(curl -fsS -H "Authorization: Bearer $TOKEN" "$MM/api/v4/users/username/$FAMILY-$name" 2>/dev/null \
      | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' 2>/dev/null || true)
    [ -n "$id" ] && break
    sleep 1
  done
  if [ -z "$id" ]; then echo "no Mattermost account for $FAMILY-$name yet"; continue; fi
  curl -fsS -o /dev/null -H "Authorization: Bearer $TOKEN" -F "image=@$ROOT/art/avatars/$name.png" "$MM/api/v4/users/$id/image" \
    && echo "avatar set for $FAMILY-$name"
done
