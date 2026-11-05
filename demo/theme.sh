#!/usr/bin/env bash
# Give the demo family a warm, capybara-coloured Mattermost theme.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/../stack" && pwd)"
MM="${MM_URL:-http://127.0.0.1:8065}"
# shellcheck disable=SC1091
set -a; . "$HERE/.env"; set +a
THEME='{"type":"custom","sidebarBg":"#5A3A26","sidebarText":"#FFF3E0","sidebarUnreadText":"#FFFFFF","sidebarTextHoverBg":"#6E4A33","sidebarTextActiveBorder":"#F8C630","sidebarTextActiveColor":"#FFFFFF","sidebarHeaderBg":"#4A2E1E","sidebarHeaderTextColor":"#FFF3E0","sidebarTeamBarBg":"#3E2618","onlineIndicator":"#7BC67B","awayIndicator":"#F8C630","dndIndicator":"#E2574C","mentionBg":"#F8C630","mentionColor":"#4A2E1E","centerChannelBg":"#FFFCF6","centerChannelColor":"#3A2618","newMessageSeparator":"#E2574C","linkColor":"#B5651D","buttonBg":"#B97C4D","buttonColor":"#FFFFFF","errorTextColor":"#D24B4E","mentionHighlightBg":"#FFE7A3","mentionHighlightLink":"#8A4B1F","codeTheme":"github"}'
for who in "$MATTERMOST_USER:$MATTERMOST_USER_PASSWORD" "mia:$MIA_PASSWORD" "nana:$NANA_PASSWORD"; do
  user="${who%%:*}"; pass="${who#*:}"
  TOKEN=$(curl -fsS -i -X POST "$MM/api/v4/users/login" -H 'Content-Type: application/json' \
    -d "{\"login_id\":\"$user\",\"password\":\"$pass\"}" | awk -F': ' 'tolower($1)=="token"{print $2}' | tr -d '\r')
  ID=$(curl -fsS -H "Authorization: Bearer $TOKEN" "$MM/api/v4/users/me" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
  BODY=$(python3 -c 'import json,sys; print(json.dumps([{"user_id":sys.argv[1],"category":"theme","name":"","value":sys.argv[2]}]))' "$ID" "$THEME")
  curl -fsS -o /dev/null -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    "$MM/api/v4/users/$ID/preferences" -d "$BODY" && echo "theme set for $user"
done
