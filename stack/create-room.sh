#!/usr/bin/env bash
# Create the CapyTales room on the local Switch server from the template
# (the same request Switch Console sends), then give each capybara its avatar
# in Mattermost.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
API="${SWITCH_API:-http://127.0.0.1:8000}"
MM="${MM_URL:-http://127.0.0.1:8065}"
# shellcheck disable=SC1091
set -a; . "$HERE/.env"; set +a

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
curl -fsS -c "$JAR" -o /dev/null -X POST "$API/gateway/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$GATEWAY_ADMIN_EMAIL\",\"password\":\"$GATEWAY_ADMIN_PASSWORD\"}"

python3 - "$ROOT/templates/capytales.template.yaml" > "$HERE/.run.json" <<'EOF'
import json, sys
print(json.dumps({
  "template": open(sys.argv[1]).read(),
  "template_name": "capytales",
  "inputs": {"family": "capy", "kid": "Mia", "age": 6, "kid_user": "mia",
             "grandparent_user": "nana", "provider": "claude"},
  "filled": {},
}))
EOF
curl -fsS -b "$JAR" -X POST "$API/gateway/rooms/from-template-document" -H 'Content-Type: application/json' \
  --data @"$HERE/.run.json" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("agents:", ", ".join(a["name"] for a in d["created_agents"])); print("room:", d["room"]["room_name"])'
rm -f "$HERE/.run.json"

# Avatars: upload each capybara's picture to its Mattermost bot account.
TOKEN=$(curl -fsS -i -X POST "$MM/api/v4/users/login" -H 'Content-Type: application/json' \
  -d "{\"login_id\":\"$MATTERMOST_ADMIN_USER\",\"password\":\"$MATTERMOST_ADMIN_PASSWORD\"}" | awk -F': ' 'tolower($1)=="token"{print $2}' | tr -d '\r')
for name in mochi pebble yuzu tofu; do
  for _ in $(seq 1 20); do
    id=$(curl -fsS -H "Authorization: Bearer $TOKEN" "$MM/api/v4/users/username/capy-$name" 2>/dev/null \
      | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' 2>/dev/null || true)
    [ -n "$id" ] && break
    sleep 1
  done
  if [ -z "$id" ]; then echo "no Mattermost account for capy-$name yet"; continue; fi
  curl -fsS -o /dev/null -H "Authorization: Bearer $TOKEN" -F "image=@$ROOT/art/avatars/$name.png" "$MM/api/v4/users/$id/image" \
    && echo "avatar set for capy-$name"
done
