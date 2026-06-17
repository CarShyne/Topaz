#!/usr/bin/env bash
# Publish Intel (amd64) image only — use when Portainer runs on Intel NAS/PC.
# Overwrites jt7777/topaz:latest with a build that works on amd64.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE="jt7777/topaz:latest"
BUILD_ID="$(date +%Y%m%d-%H%M%S)-amd64"

echo ""
echo "=== Publish Topaz (Intel / amd64) ==="
echo "Image: $IMAGE"
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop first."
  exit 1
fi

git pull

docker buildx inspect topaz-builder >/dev/null 2>&1 || docker buildx create --name topaz-builder --use
docker buildx use topaz-builder

echo "Building linux/amd64 only..."
docker buildx build --platform linux/amd64 \
  --no-cache \
  --build-arg CACHEBUST="$BUILD_ID" \
  --build-arg TOPAZ_BUILD="$BUILD_ID" \
  -t "$IMAGE" \
  --push \
  .

echo ""
echo "DONE — $IMAGE (amd64) pushed."
echo "Portainer: use image jt7777/topaz:latest → Pull and redeploy"
echo "Check: http://YOUR-SERVER:3921/api/vault/whatami"
echo ""
