#!/usr/bin/env bash
# Run Topaz locally in Docker (builds on this machine, does not push).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "=== Topaz local Docker ==="
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop first."
  exit 1
fi

git pull

echo "Building..."
docker compose build --no-cache

echo "Starting..."
docker compose up -d --force-recreate

sleep 4
if curl -fsS "http://127.0.0.1:3921/api/gem/health" | grep -q '"ok":true'; then
  echo ""
  echo "SUCCESS — open http://127.0.0.1:3921"
  echo "You should see: Next Level Notes"
else
  echo "Health check failed:"
  docker compose logs --tail 40 topaz
  exit 1
fi
