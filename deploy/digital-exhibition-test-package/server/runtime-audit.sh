#!/usr/bin/env bash
set -euo pipefail

SERVICE="${DEH_SERVICE_NAME:-digital-exhibition-test.service}"

echo "RUNTIME_AUDIT_STARTED_AT=$(date -Is)"
systemctl show "$SERVICE" \
  --property=Id,ActiveState,SubState,MainPID,ExecMainStartTimestamp,FragmentPath,WorkingDirectory,ExecStart,EnvironmentFiles \
  --no-pager

echo "NODE_PROCESSES"
pgrep -af 'node.*test-deployment-server\.mjs' || true

echo "PORT_4173_LISTENERS"
ss -ltnp 'sport = :4173' || true

while read -r pid; do
  [ -n "$pid" ] || continue
  echo "PROCESS_PID=$pid"
  echo "PROCESS_CWD=$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  echo -n "PROCESS_CMDLINE="
  tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true
  echo
  echo "PROCESS_RUNTIME_PATHS"
  tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null \
    | grep -E '^(FEISHU_RUNTIME_CACHE_DIR|FEISHU_READ_CACHE_FILE|SERVER_CONFIG_PATH|NODE_ENV|DEPLOYED_RELEASE_ID|GIT_COMMIT)=' || true
done < <(pgrep -f 'node.*test-deployment-server\.mjs' || true)

CACHE_DIR="${FEISHU_RUNTIME_CACHE_DIR:-/home/seaoil/pre-demo/runtime-cache}"
echo "CACHE_DIRECTORY=$CACHE_DIR"
find "$CACHE_DIR" -maxdepth 2 -type f -printf '%TY-%Tm-%TdT%TH:%TM:%TS %s %p\n' 2>/dev/null | sort || true

echo "HEALTH_LIVE"
curl -fsS http://127.0.0.1:4173/api/v1/health/live || true
echo
echo "HEALTH_READY"
curl -fsS http://127.0.0.1:4173/api/v1/health/ready || true
echo

if [ "$#" -gt 0 ]; then
  pattern="$(printf '%s|' "$@")"
  pattern="${pattern%|}"
  echo "SYNC_TIMELINE_PATTERN=$pattern"
  journalctl -u "$SERVICE" --since '24 hours ago' --no-pager -o short-iso \
    | grep -E "$pattern" || true
fi
