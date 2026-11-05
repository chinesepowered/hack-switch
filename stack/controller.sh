#!/usr/bin/env bash
# Enroll this machine with the local Switch server (first run only) and start
# Switch's headless agent controller, which runs the capybara agents.
#
# Needs switch-agent-controller on PATH (Switch's signed release):
#   sh <switch checkout>/console/packages/agent-controller/install.sh --version 0.31.0
# Secrets for the agents (ELEVENLABS_API_KEY for Yuzu) go in stack/controller.env,
# which is gitignored.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="$HERE/controller"
ENV_FILE="$HERE/controller.env"
LOGS="$HERE/logs"
API="${SWITCH_API:-http://127.0.0.1:8000}"
mkdir -p "$DATA" "$LOGS"
chmod 700 "$DATA"
# shellcheck disable=SC1091
set -a; . "$HERE/.env"; set +a

command -v switch-agent-controller >/dev/null || { echo "switch-agent-controller is not installed." >&2; exit 1; }
[ -f "$ENV_FILE" ] || { umask 077; echo "# Secrets for the capybaras. Never commit." > "$ENV_FILE"; }

if ! switch-agent-controller status --data-dir "$DATA" >/dev/null 2>&1; then
  echo "Enrolling this machine with Switch..."
  JAR="$(mktemp)"
  curl -fsS -c "$JAR" -o /dev/null -X POST "$API/gateway/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$GATEWAY_ADMIN_EMAIL\",\"password\":\"$GATEWAY_ADMIN_PASSWORD\"}"
  CODE=$(curl -fsS -b "$JAR" -X POST "$API/gateway/management/enrollment-codes" -H 'Content-Type: application/json' -d '{}' \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["code"])')
  rm -f "$JAR"
  switch-agent-controller enroll --server "$API" --code "$CODE" --name capytales-box \
    --description "Runs the CapyTales capybaras" --data-dir "$DATA" --secret-store file
fi

if pgrep -f "switch-agent-controller run --data-dir $DATA" >/dev/null; then
  echo "Agent controller already running."
  exit 0
fi

echo "Starting the agent controller..."
# Run agents as plain local sessions: drop variables that tie a process to the
# hosting Claude Code session, if any are set in this shell.
nohup env -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_REMOTE_SESSION_ID -u CLAUDE_CODE_MESSAGING_SOCKET \
  -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_REMOTE -u CLAUDE_CODE_USE_CCR_V2 \
  -u CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2 -u CLAUDE_CODE_TEE_SDK_STDOUT -u CLAUDE_PID -u CLAUDECODE \
  -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_CHILD_SESSION \
  switch-agent-controller run --data-dir "$DATA" --env-file "$ENV_FILE" > "$LOGS/controller.log" 2>&1 &
sleep 5
tail -n 5 "$LOGS/controller.log"
