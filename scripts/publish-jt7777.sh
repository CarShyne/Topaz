#!/usr/bin/env bash
# Build the latest Topaz and push to Docker Hub as jt7777/topaz:latest.
# Run this on your Mac after code changes — then everyone pulling jt7777/topaz gets the update.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="jt7777/topaz:latest"

echo ""
echo "=== Publish Topaz to Docker Hub ==="
echo "Image: $IMAGE"
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop first."
  exit 1
fi

echo "Getting latest code..."
git pull

echo ""
echo "Building (3–5 minutes)..."
docker build -t "$IMAGE" .

echo ""
echo "Pushing to Docker Hub..."
echo "(If this fails, run: docker login)"
docker push "$IMAGE"

echo ""
echo "DONE — image published."
echo ""
echo "Next: In Portainer → Stacks → Topaz → Pull and redeploy"
echo "Then open Topaz — you should see 'Next Level Notes' and Create vault should work."
echo ""
