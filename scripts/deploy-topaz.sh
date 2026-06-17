#!/usr/bin/env bash
# Rebuild and restart Topaz in Docker (run on the machine that hosts Docker/Portainer).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== Topaz deploy ==="
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running."
  echo "1. Open the Docker app (whale icon) and wait until it says Running"
  echo "2. Run this script again"
  exit 1
fi

echo "Getting latest code..."
git pull

echo ""
echo "Building (3–5 minutes)..."
docker compose -f docker-compose.portainer.yml pull || docker compose build --no-cache

echo ""
echo "Starting..."
docker compose -f docker-compose.portainer.yml up -d --force-recreate

echo ""
echo "Checking..."
sleep 4
HEALTH="$(curl -fsS "http://127.0.0.1:3921/api/vault/health" 2>/dev/null || true)"
if echo "$HEALTH" | grep -q '"ok":true'; then
  BUILD="$(echo "$HEALTH" | sed -n 's/.*"build":"\([^"]*\)".*/\1/p')"
  echo ""
  echo "SUCCESS"
  echo "  Open: http://127.0.0.1:3921"
  echo "  You should see: Next Level Notes (build ${BUILD:-2026-06-16})"
  echo "  NOT: Your connected knowledge base"
  echo ""
else
  echo ""
  echo "Health check failed. Logs:"
  docker compose -f docker-compose.portainer.yml logs --tail 50 topaz
  exit 1
fi
