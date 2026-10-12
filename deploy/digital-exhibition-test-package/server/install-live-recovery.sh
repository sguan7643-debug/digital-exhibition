#!/usr/bin/env bash
set -euo pipefail

BASE="/home/seaoil/pre-demo"
RELEASES="$BASE/releases"
TARGET="$BASE/test"
SERVICE="digital-exhibition-test.service"
PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_ID="${DEPLOYED_RELEASE_ID:-$(date +%Y%m%d%H%M%S)}"
STAGE="$RELEASES/${RELEASE_ID}-stage"
ROLLBACK="$BASE/rollback-$RELEASE_ID"
FAILED="$BASE/failed-deploy-$RELEASE_ID"

[[ "$RELEASE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{5,80}$ ]] \
  || { echo "RELEASE_ID 非法，停止部署" >&2; exit 1; }

case "$(readlink -f "$STAGE")" in
  "$RELEASES"/*-stage) ;;
  *) echo "STAGE 路径不安全，停止部署" >&2; exit 1 ;;
esac
[ -d "$TARGET" ] || { echo "当前运行目录不存在：$TARGET" >&2; exit 1; }
[ -f "$PACKAGE_ROOT/server/test-deployment-server.mjs" ] || { echo "部署包不完整" >&2; exit 1; }
[ ! -e "$STAGE" ] || { echo "暂存目录已存在：$STAGE" >&2; exit 1; }
[ ! -e "$ROLLBACK" ] || { echo "回滚目录已存在：$ROLLBACK" >&2; exit 1; }
[ ! -e "$FAILED" ] || { echo "失败目录已存在：$FAILED" >&2; exit 1; }

install -d -m 755 "$STAGE"
cp -a "$TARGET/." "$STAGE/"

# STAGE 是刚创建且已验证位于 releases 下的目录。删除其中旧后端，保留
# 当前 .env、dist、.local 与其他运行数据，再复制纯后端包。
rm -rf -- "$STAGE/server" "$STAGE/node_modules/undici"
rm -f -- "$STAGE/package.json" "$STAGE/release-metadata.json" "$STAGE/SHA256SUMS.txt" "$STAGE/README.md"
cp -a "$PACKAGE_ROOT/." "$STAGE/"
chown -R seaoil-deh:seaoil-deh "$STAGE"
chmod 600 "$STAGE/.env"

sudo -u seaoil-deh node -e "import('${STAGE}/server/test-deployment-server.mjs').then(() => console.log('BACKEND_IMPORT_OK'))"

systemctl stop "$SERVICE"
systemctl kill --kill-who=all --signal=SIGKILL "$SERVICE" 2>/dev/null || true
sudo -u seaoil-deh node "$STAGE/server/clear-read-cache-operations.mjs" \
  --file="$BASE/runtime-cache/feishu-read-cache-v1.json" \
  --operations=HOM-001,COM-001,APP-001,APP-002,COM-004,WB-002

mv "$TARGET" "$ROLLBACK"
mv "$STAGE" "$TARGET"
systemctl start "$SERVICE"

ready=0
for attempt in $(seq 1 30); do
  http="$(curl -sS -o /tmp/deh-ready.json -w '%{http_code}' http://127.0.0.1:4173/api/v1/health/ready || true)"
  if [ "$http" = "200" ]; then ready=1; break; fi
  sleep 2
done

if [ "$ready" != "1" ]; then
  systemctl stop "$SERVICE" || true
  mv "$TARGET" "$FAILED"
  mv "$ROLLBACK" "$TARGET"
  systemctl start "$SERVICE"
  echo "DEPLOYMENT_ROLLED_BACK=$ROLLBACK" >&2
  exit 1
fi

PACKAGE_RELEASE="$(node -e "const m=require('${TARGET}/release-metadata.json'); process.stdout.write(String(m.release || 'unknown'))")"
echo "DEPLOYED_RELEASE_ID=$PACKAGE_RELEASE"
echo "DEPLOYMENT_DIRECTORY_ID=$RELEASE_ID"
echo "ROLLBACK_PATH=$ROLLBACK"
cat /tmp/deh-ready.json
echo
bash "$TARGET/server/runtime-audit.sh"
