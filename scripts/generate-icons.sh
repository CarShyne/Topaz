#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${TOPAZ_ICON_SRC:-$HOME/Desktop/Topaz.png}"
ICONSET="$ROOT/resources/Topaz.iconset"
IOS_ICON="$ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"

if [ ! -f "$SRC" ]; then
  echo "Source icon not found: $SRC"
  exit 1
fi

mkdir -p "$ROOT/resources" "$ROOT/src/assets" "$(dirname "$IOS_ICON")"

# Master 1024x1024 icon
sips -z 1024 1024 "$SRC" --out "$ROOT/resources/icon-1024.png" >/dev/null
cp "$ROOT/resources/icon-1024.png" "$IOS_ICON"
cp "$ROOT/resources/icon-1024.png" "$ROOT/resources/icon.png"
cp "$ROOT/resources/icon-1024.png" "$ROOT/src/assets/icon.png"

# macOS .icns
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
sips -z 16 16     "$SRC" --out "$ICONSET/icon_16x16.png" >/dev/null
sips -z 32 32     "$SRC" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
sips -z 32 32     "$SRC" --out "$ICONSET/icon_32x32.png" >/dev/null
sips -z 64 64     "$SRC" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
sips -z 128 128   "$SRC" --out "$ICONSET/icon_128x128.png" >/dev/null
sips -z 256 256   "$SRC" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "$SRC" --out "$ICONSET/icon_256x256.png" >/dev/null
sips -z 512 512   "$SRC" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "$SRC" --out "$ICONSET/icon_512x512.png" >/dev/null
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
iconutil -c icns "$ICONSET" -o "$ROOT/resources/icon.icns" 2>/dev/null || true

echo "Icons generated:"
echo "  iOS:     $IOS_ICON"
echo "  macOS:   $ROOT/resources/icon.icns"
echo "  in-app:  $ROOT/src/assets/icon.png"
