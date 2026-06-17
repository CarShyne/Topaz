#!/usr/bin/env bash
# Build the latest Topaz and push to Docker Hub as jt7777/topaz:latest.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="jt7777/topaz:latest"
BUILD_ID="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"

echo ""
echo "=== Publish Topaz to Docker Hub ==="
echo "Image: $IMAGE"
echo "Build id: $BUILD_ID"
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop first."
  exit 1
fi

echo "Getting latest code..."
git pull

echo ""
echo "Building with --no-cache (3–8 minutes)..."
docker build --no-cache \
  --build-arg CACHEBUST="$BUILD_ID" \
  --build-arg TOPAZ_BUILD="$BUILD_ID" \
  -t "$IMAGE" \
  .

echo ""
echo "Verifying image contains Next Level Notes..."
docker run --rm "$IMAGE" sh -c 'grep -q "Next Level Notes" /app/dist-web/assets/*.js && grep -q "Next Level Notes" /app/dist-web/index.html'

echo ""
echo "Pushing to Docker Hub..."
docker push "$IMAGE"

DIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE" 2>/dev/null || true)"

echo ""
echo "DONE — published $IMAGE"
echo "Build: $BUILD_ID"
echo "${DIGEST:-}(see Docker Hub for digest)}"
echo ""
echo "NEXT STEPS (important):"
echo "  1. Portainer → Stacks → Topaz → Stop"
echo "  2. Remove the old container (or enable Recreate)"
echo "  3. Pull and redeploy"
echo "  4. Open: http://YOUR-SERVER:3921/api/vault/check"
echo "     Must show build: $BUILD_ID"
echo "  5. Safari: delete old home-screen icon, add again after hard refresh"
echo ""
