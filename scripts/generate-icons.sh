#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICONSET="$ROOT/resources/Topaz.iconset"
IOS_SET="$ROOT/ios/App/App/Assets.xcassets/AppIcon.appiconset"
COMPOSITE="$ROOT/scripts/composite-icon.swift"
BG_HEX="080808"

resolve_icon_source() {
  if [ -n "${TOPAZ_ICON_SRC:-}" ] && [ -f "${TOPAZ_ICON_SRC}" ]; then
    echo "${TOPAZ_ICON_SRC}"
    return
  fi
  if [ -f "$ROOT/resources/icon-1024-source.png" ]; then
    echo "$ROOT/resources/icon-1024-source.png"
    return
  fi
  if [ -f "$ROOT/resources/icon-1024.png" ]; then
    echo "$ROOT/resources/icon-1024.png"
    return
  fi
  if [ -f "$ROOT/Topaz.png" ]; then
    echo "$ROOT/Topaz.png"
    return
  fi
  if [ -f "$HOME/Desktop/Topaz.png" ]; then
    echo "$HOME/Desktop/Topaz.png"
    return
  fi
  return 1
}

render_icon() {
  local mode="$1"
  local out="$2"
  local size="${3:-1024}"
  swift "$COMPOSITE" "$mode" "$BG_HEX" "$MASTER_SRC" "$out" "$size"
}

SRC="$(resolve_icon_source)" || {
  echo "Source icon not found. Set TOPAZ_ICON_SRC or add resources/icon-1024-source.png, Topaz.png, or ~/Desktop/Topaz.png"
  exit 1
}

mkdir -p "$ROOT/resources" "$ROOT/src/assets" "$IOS_SET"

# Keep a pristine copy of the transparent source for dark/tinted variants
if [ "$SRC" != "$ROOT/resources/icon-1024-source.png" ]; then
  cp "$SRC" "$ROOT/resources/icon-1024-source.png"
fi
MASTER_SRC="$ROOT/resources/icon-1024-source.png"

# Default in-app / marketing master — gem on Topaz dark (#080808), not white
render_icon opaque-dark "$ROOT/resources/icon-1024.png"
cp "$ROOT/resources/icon-1024.png" "$ROOT/resources/icon.png"
cp "$ROOT/resources/icon-1024.png" "$ROOT/src/assets/icon.png"
sips -z 180 180 "$ROOT/resources/icon-1024.png" --out "$ROOT/resources/icon-180.png" >/dev/null

# iOS 18+ icon set: Any (dark bg), Dark (transparent for system dark backing), Tinted (grayscale)
rm -f "$IOS_SET"/*.png
render_icon opaque-dark "$IOS_SET/AppIcon-1024.png"
render_icon dark "$IOS_SET/AppIcon-1024-dark.png"
render_icon tinted "$IOS_SET/AppIcon-1024-tinted.png"

# Legacy size slots — all use dark background, never white
legacy_sizes=(
  "40:Icon-App-20x20@2x.png"
  "60:Icon-App-20x20@3x.png"
  "58:Icon-App-29x29@2x.png"
  "87:Icon-App-29x29@3x.png"
  "80:Icon-App-40x40@2x.png"
  "120:Icon-App-40x40@3x.png"
  "120:Icon-App-60x60@2x.png"
  "180:Icon-App-60x60@3x.png"
  "20:Icon-App-20x20@1x.png"
  "29:Icon-App-29x29@1x.png"
  "40:Icon-App-40x40@1x.png"
  "76:Icon-App-76x76@1x.png"
  "152:Icon-App-76x76@2x.png"
  "167:Icon-App-83.5x83.5@2x.png"
)
for entry in "${legacy_sizes[@]}"; do
  size="${entry%%:*}"
  file="${entry##*:}"
  render_icon opaque-dark "$IOS_SET/$file" "$size"
done

cat > "$IOS_SET/Contents.json" <<'EOF'
{
  "images" : [
    {
      "filename" : "AppIcon-1024.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        }
      ],
      "filename" : "AppIcon-1024-dark.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "tinted"
        }
      ],
      "filename" : "AppIcon-1024-tinted.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    { "filename" : "Icon-App-20x20@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "20x20" },
    { "filename" : "Icon-App-20x20@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "20x20" },
    { "filename" : "Icon-App-29x29@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "29x29" },
    { "filename" : "Icon-App-29x29@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "29x29" },
    { "filename" : "Icon-App-40x40@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "40x40" },
    { "filename" : "Icon-App-40x40@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "40x40" },
    { "filename" : "Icon-App-60x60@2x.png", "idiom" : "iphone", "scale" : "2x", "size" : "60x60" },
    { "filename" : "Icon-App-60x60@3x.png", "idiom" : "iphone", "scale" : "3x", "size" : "60x60" },
    { "filename" : "Icon-App-20x20@1x.png", "idiom" : "ipad", "scale" : "1x", "size" : "20x20" },
    { "filename" : "Icon-App-20x20@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "20x20" },
    { "filename" : "Icon-App-29x29@1x.png", "idiom" : "ipad", "scale" : "1x", "size" : "29x29" },
    { "filename" : "Icon-App-29x29@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "29x29" },
    { "filename" : "Icon-App-40x40@1x.png", "idiom" : "ipad", "scale" : "1x", "size" : "40x40" },
    { "filename" : "Icon-App-40x40@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "40x40" },
    { "filename" : "Icon-App-76x76@1x.png", "idiom" : "ipad", "scale" : "1x", "size" : "76x76" },
    { "filename" : "Icon-App-76x76@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "76x76" },
    { "filename" : "Icon-App-83.5x83.5@2x.png", "idiom" : "ipad", "scale" : "2x", "size" : "83.5x83.5" },
    { "filename" : "AppIcon-1024.png", "idiom" : "ios-marketing", "scale" : "1x", "size" : "1024x1024" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
EOF

# macOS .icns — gem on dark background
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
for spec in "16:icon_16x16.png" "32:icon_16x16@2x.png" "32:icon_32x32.png" "64:icon_32x32@2x.png" \
  "128:icon_128x128.png" "256:icon_128x128@2x.png" "256:icon_256x256.png" "512:icon_256x256@2x.png" \
  "512:icon_512x512.png" "1024:icon_512x512@2x.png"; do
  size="${spec%%:*}"
  file="${spec##*:}"
  render_icon opaque-dark "$ICONSET/$file" "$size"
done
iconutil -c icns "$ICONSET" -o "$ROOT/resources/icon.icns" 2>/dev/null || true

echo "Icons generated:"
echo "  iOS:     $IOS_SET (dark bg + iOS 18 dark/tinted variants)"
echo "  macOS:   $ROOT/resources/icon.icns"
echo "  in-app:  $ROOT/src/assets/icon.png"
