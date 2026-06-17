#!/usr/bin/env bash
# Rebuild and restart Topaz in Docker (run on the machine that hosts Docker/Portainer).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== Topaz deploy ==="
echo "This rebuilds the app from the latest code (takes a few minutes)."
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not in your PATH."
  echo "Install Docker Desktop, then run this script again."
  exit 1
fi

echo "Step 1/3: Building image jt7777/topaz:latest ..."
docker compose build

echo ""
echo "Step 2/3: Starting container ..."
docker compose up -d --force-recreate

echo ""
echo "Step 3/3: Checking server ..."
sleep 3
if curl -fsS "http://127.0.0.1:3921/api/vault/health" | grep -q '"ok":true'; then
  echo ""
  echo "SUCCESS — Topaz is running."
  echo "Open in your browser: http://127.0.0.1:3921"
  echo "(Replace 127.0.0.1 with your server's IP if you're on another device.)"
  echo ""
else
  echo ""
  echo "Container started but health check failed. Last log lines:"
  docker compose logs --tail 40 topaz || true
  echo ""
  echo "If you use Portainer, update the stack to use 'build: .' and redeploy."
  exit 1
fi
