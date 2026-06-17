#!/usr/bin/env bash
# Build multi-arch (Intel + Apple Silicon) and push to Docker Hub.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="jt7777/topaz"
BUILD_ID="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
GIT_SHA="$(git rev-parse --short HEAD)"

echo ""
echo "=== Publish Topaz to Docker Hub (multi-arch) ==="
echo "Tags: ${IMAGE}:latest and ${IMAGE}:${GIT_SHA}"
echo "Build id: $BUILD_ID"
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop first."
  exit 1
fi

echo "Getting latest code..."
git pull

echo ""
echo "Setting up buildx (if needed)..."
docker buildx inspect topaz-builder >/dev/null 2>&1 || docker buildx create --name topaz-builder --use
docker buildx use topaz-builder

echo ""
echo "Building for linux/amd64 + linux/arm64 (5–15 minutes)..."
docker buildx build --platform linux/amd64,linux/arm64 \
  --no-cache \
  --build-arg CACHEBUST="$BUILD_ID" \
  --build-arg TOPAZ_BUILD="$BUILD_ID" \
  -t "${IMAGE}:latest" \
  -t "${IMAGE}:${GIT_SHA}" \
  --push \
  .

echo ""
echo "DONE — published:"
echo "  ${IMAGE}:latest"
echo "  ${IMAGE}:${GIT_SHA}"
echo ""
echo "In Portainer, set image to: ${IMAGE}:${GIT_SHA}"
echo "  (Using a version tag avoids stale amd64/arm64 'latest' confusion.)"
echo ""
echo "Then open: http://YOUR-SERVER:3921/api/vault/whatami"
echo "  Must show hasNewTagline: true"
echo ""
