#!/usr/bin/env bash
# Create the CapyTales room on the local Switch server from the template
# (the same request Switch Console sends), then give each capybara its avatar.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
API="${SWITCH_API:-http://127.0.0.1:8000}"
# shellcheck disable=SC1091
set -a; . "$HERE/.env"; set +a

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
curl -fsS -c "$WORK/jar" -o /dev/null -X POST "$API/gateway/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$GATEWAY_ADMIN_EMAIL\",\"password\":\"$GATEWAY_ADMIN_PASSWORD\"}"

python3 - "$ROOT/templates/capytales.template.yaml" > "$WORK/run.json" <<'EOF'
import json, sys
print(json.dumps({
  "template": open(sys.argv[1]).read(),
  "template_name": "capytales",
  "inputs": {"family": "capy", "kid": "Mia", "age": 6, "kid_user": "mia",
             "grandparent_user": "nana", "provider": "claude"},
  "filled": {},
}))
EOF

# A controller that has only just connected may not have reported its
# providers yet, and Switch refuses the run until it has: retry briefly.
for attempt in $(seq 1 10); do
  code=$(curl -sS -b "$WORK/jar" -o "$WORK/out.json" -w '%{http_code}' -X POST "$API/gateway/rooms/from-template-document" \
    -H 'Content-Type: application/json' --data @"$WORK/run.json")
  [ "$code" = "201" ] && break
  if [ "$attempt" = "10" ]; then echo "Switch refused the template run ($code):" >&2; cat "$WORK/out.json" >&2; exit 1; fi
  sleep 3
done
python3 -c 'import sys,json; d=json.load(open(sys.argv[1])); print("agents:", ", ".join(a["name"] for a in d["created_agents"])); print("room:", d["room"]["room_name"])' "$WORK/out.json"

"$HERE/avatars.sh" capy
