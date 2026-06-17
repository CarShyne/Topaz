#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

TEAM_ID="${TOPAZ_DEVELOPMENT_TEAM:-75HW6573C5}"

if [ -d "/Applications/Xcode.app/Contents/Developer" ]; then
  export DEVELOPER_DIR="/Applications/Xcode.app/Contents/Developer"
elif [ -d "/Applications/Xcode-beta.app/Contents/Developer" ]; then
  export DEVELOPER_DIR="/Applications/Xcode-beta.app/Contents/Developer"
fi

echo "→ Building mobile web assets..."
npm run build:mobile
npx cap sync ios

IOS_DIR="ios/App"
ARCHIVE_PATH="build/Topaz-signed.xcarchive"
EXPORT_DIR="build/ipa-export"
IPA_PATH="release/Topaz-signed.ipa"
EXPORT_PLIST="scripts/ExportOptions.plist"

mkdir -p build release scripts

cat > "$EXPORT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
  <key>teamID</key>
  <string>${TEAM_ID}</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>compileBitcode</key>
  <false/>
</dict>
</plist>
EOF

echo "→ Archiving with team ${TEAM_ID}..."
xcodebuild \
  -project "$IOS_DIR/App.xcodeproj" \
  -scheme App \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  archive

echo "→ Exporting signed IPA..."
rm -rf "$EXPORT_DIR"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  -allowProvisioningUpdates

cp "$EXPORT_DIR/App.ipa" "$IPA_PATH"

echo ""
echo "✓ Signed IPA: $(pwd)/$IPA_PATH"
echo "  Install via Xcode Devices window, Apple Configurator, or sideload tools."
