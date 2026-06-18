#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Prefer stable Xcode if installed
if [ -d "/Applications/Xcode.app/Contents/Developer" ]; then
  export DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"
fi

echo "→ Generating app icons..."
npm run icons

echo "→ Building mobile web assets..."
npm run build:mobile

echo "→ Syncing Capacitor iOS..."
npx cap sync ios

IOS_DIR="ios/App"
ARCHIVE_PATH="build/Topaz.xcarchive"
EXPORT_PATH="build/ipa"
IPA_PATH="release/Topaz.ipa"

mkdir -p build release

echo "→ Archiving iOS app..."
xcodebuild \
  -project "$IOS_DIR/App.xcodeproj" \
  -scheme App \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_ALLOWED=NO \
  archive

echo "→ Packaging IPA..."
rm -rf "$EXPORT_PATH"
mkdir -p "$EXPORT_PATH/Payload"
cp -R "$ARCHIVE_PATH/Products/Applications/App.app" "$EXPORT_PATH/Payload/"

cd "$EXPORT_PATH"
zip -qr "../../release/Topaz.ipa" Payload
cd ../..

echo ""
echo "✓ IPA ready: $(pwd)/$IPA_PATH"
echo "  Sideload with AltStore, Sideloadly, or similar (re-sign with your Apple ID)."
