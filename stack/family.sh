#!/usr/bin/env bash
# Create the demo family in the local Mattermost: Sam (the parent, created by
# Switch's setup as "parent"), Mia (the kid) and Nana (grandma). Passwords are
# random and saved to stack/.env so the demo recorder can sign in as them.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$HERE/.env"
MM="${MM_URL:-http://127.0.0.1:8065}"
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

TOKEN=$(curl -fsS -i -X POST "$MM/api/v4/users/login" -H 'Content-Type: application/json' \
  -d "{\"login_id\":\"$MATTERMOST_ADMIN_USER\",\"password\":\"$MATTERMOST_ADMIN_PASSWORD\"}" | awk -F': ' 'tolower($1)=="token"{print $2}' | tr -d '\r')
api() { curl -fsS -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' "$@"; }
TEAM_ID=$(api "$MM/api/v4/teams/name/$MATTERMOST_TEAM_NAME" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

ensure_user() { # username first_name nickname envvar
  local user="$1" first="$2" nick="$3" var="$4" pass
  pass="${!var:-}"
  if [ -z "$pass" ]; then
    pass="Capy-$(openssl rand -hex 10)"
    echo "$var=$pass" >> "$ENV_FILE"
  fi
  local id
  id=$(api "$MM/api/v4/users/username/$user" 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' 2>/dev/null || true)
  if [ -z "$id" ]; then
    id=$(api -X POST "$MM/api/v4/users" -d "{\"username\":\"$user\",\"email\":\"$user@capytales.local\",\"password\":\"$pass\",\"first_name\":\"$first\",\"nickname\":\"$nick\"}" \
      | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
    echo "created $user"
  else
    api -X PUT "$MM/api/v4/users/$id/patch" -d "{\"first_name\":\"$first\",\"last_name\":\"\",\"nickname\":\"$nick\"}" >/dev/null
    echo "updated $user"
  fi
  api -X POST "$MM/api/v4/teams/$TEAM_ID/members" -d "{\"team_id\":\"$TEAM_ID\",\"user_id\":\"$id\"}" >/dev/null || true
}

# The parent's password already exists (MATTERMOST_USER_PASSWORD).
ensure_user "$MATTERMOST_USER" "Sam" "Parent" MATTERMOST_USER_PASSWORD
ensure_user mia "Mia" "Kid" MIA_PASSWORD
ensure_user nana "Nana" "Grandma" NANA_PASSWORD
echo "Family ready in team $MATTERMOST_TEAM_NAME: $MATTERMOST_USER (Sam), mia, nana"
