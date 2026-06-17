#!/usr/bin/env bash
# Build Windows installer on your Mac — copy to Windows via git, no npm needed there.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/installers/windows"
mkdir -p "$DEST"

cd "$ROOT"
npm run icons 2>/dev/null || true
npm run build
npx electron-builder --win

INSTALLER=$(find "$ROOT/release" -maxdepth 1 -name 'Topaz Setup*.exe' | head -1)
if [ -z "$INSTALLER" ]; then
  echo "Installer not found in release/"
  exit 1
fi

cp "$INSTALLER" "$DEST/Topaz-Setup.exe"
echo "Windows installer: $DEST/Topaz-Setup.exe"
echo "Run: bash scripts/setup-local-git.sh  — to commit and push to your local bare repo"
