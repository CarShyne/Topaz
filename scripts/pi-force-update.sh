#!/usr/bin/env bash
# Run ON the Raspberry Pi (SSH) to force Docker to pull a new image.
# Usage: ./scripts/pi-force-update.sh [tag]
# Example: ./scripts/pi-force-update.sh release-20260217-120000
set -euo pipefail

TAG="${1:-latest}"
IMAGE="jt7777/topaz:${TAG}"

echo ""
echo "=== Force update Topaz on this Pi ==="
echo "Image: $IMAGE"
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker not available. Run as root or add user to docker group."
  exit 1
fi

echo "Pulling $IMAGE ..."
docker pull "$IMAGE"

echo ""
echo "Stopping old Topaz containers..."
docker ps -a --format '{{.Names}}' | grep -i topaz | while read -r name; do
  docker stop "$name" 2>/dev/null || true
  docker rm "$name" 2>/dev/null || true
done

echo ""
echo "Removing cached jt7777/topaz images (except the one we just pulled)..."
docker images jt7777/topaz --format '{{.ID}} {{.Tag}}' | while read -r id tag; do
  if [[ "$tag" != "$TAG" && "$tag" != "TAG" ]]; then
    docker rmi "$id" 2>/dev/null || true
  fi
done

echo ""
echo "Pulled image:"
docker images jt7777/topaz --digests | head -5

echo ""
echo "Now in Portainer:"
echo "  Stacks → Topaz → set image to: $IMAGE"
echo "  Enable 'Pull latest' / 'Re-pull' → Redeploy"
echo ""
echo "Or if using compose in Portainer git stack, Pull and redeploy the stack."
echo ""
echo "Check log after start — must say (build ...) NOT (hub publishing on)"
echo "Browser: http://THIS-PI-IP:3921/api/gem/whatami"
echo ""
