#!/usr/bin/env bash
# Build multi-arch image, push to Docker Hub, update Portainer compose tag in git.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

IMAGE_REPO="jt7777/topaz"
BUILD_ID="$(date +%Y%m%d-%H%M%S)"
GIT_SHA="$(git rev-parse --short HEAD)"
RELEASE_TAG="release-${BUILD_ID}"
COMPOSE_FILE="$ROOT/docker-compose.portainer.yml"

echo ""
echo "=== Publish Topaz → Docker Hub ==="
echo "Tags: ${IMAGE_REPO}:latest  and  ${IMAGE_REPO}:${RELEASE_TAG}"
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Open Docker Desktop first."
  exit 1
fi

git pull

docker buildx inspect topaz-builder >/dev/null 2>&1 || docker buildx create --name topaz-builder --use
docker buildx use topaz-builder

echo "Building linux/amd64 + linux/arm64 (Raspberry Pi uses arm64)..."
docker buildx build --platform linux/amd64,linux/arm64 \
  --no-cache \
  --build-arg CACHEBUST="$BUILD_ID" \
  --build-arg TOPAZ_BUILD="$BUILD_ID" \
  -t "${IMAGE_REPO}:latest" \
  -t "${IMAGE_REPO}:${RELEASE_TAG}" \
  --push \
  .

echo ""
echo "Updating docker-compose.portainer.yml → ${RELEASE_TAG}"
sed -i.bak "s|image: ${IMAGE_REPO}:.*|image: ${IMAGE_REPO}:${RELEASE_TAG}|" "$COMPOSE_FILE"
rm -f "${COMPOSE_FILE}.bak"

if [[ "${1:-}" != "--no-git" ]]; then
  git add "$COMPOSE_FILE"
  git commit -m "Release Docker image ${RELEASE_TAG}" || true
  git push origin main || echo "(git push failed — update Portainer image tag manually to ${RELEASE_TAG})"
fi

echo ""
echo "============================================"
echo "DONE"
echo "  Image: ${IMAGE_REPO}:${RELEASE_TAG}"
echo "  Also:  ${IMAGE_REPO}:latest"
echo ""
echo "On Raspberry Pi / Portainer:"
echo "  1. Stacks → Topaz → Pull and redeploy"
echo "     (compose from git now points at ${RELEASE_TAG})"
echo "  OR run on the Pi: ./scripts/pi-force-update.sh ${RELEASE_TAG}"
echo ""
echo "Container log should say:"
echo "  Topaz hub listening on 0.0.0.0:3921 (build ${BUILD_ID})"
echo "NOT: (hub publishing on)"
echo ""
echo "Browser check: /api/vault/whatami → hasNewTagline: true"
echo "============================================"
echo ""
