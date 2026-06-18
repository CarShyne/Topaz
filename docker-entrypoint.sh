#!/bin/sh
set -e
export TOPAZ_NO_BONJOUR=true
export TOPAZ_DATA_DIR="${TOPAZ_DATA_DIR:-/data}"
export TOPAZ_GEMS_DIR="${TOPAZ_GEMS_DIR:-$TOPAZ_DATA_DIR/gems}"

LEGACY_VAULTS_DIR="${TOPAZ_VAULTS_DIR:-$TOPAZ_DATA_DIR/vaults}"

# Migrate legacy /data/vaults (or TOPAZ_VAULTS_DIR) to gems on first start.
if [ ! -e "$TOPAZ_GEMS_DIR" ] && [ -d "$LEGACY_VAULTS_DIR" ]; then
  ln -s "$LEGACY_VAULTS_DIR" "$TOPAZ_GEMS_DIR"
else
  mkdir -p "$TOPAZ_GEMS_DIR"
  if [ -d "$LEGACY_VAULTS_DIR" ] && [ "$LEGACY_VAULTS_DIR" != "$TOPAZ_GEMS_DIR" ]; then
    if [ -z "$(ls -A "$TOPAZ_GEMS_DIR" 2>/dev/null)" ] && [ -n "$(ls -A "$LEGACY_VAULTS_DIR" 2>/dev/null)" ]; then
      cp -a "$LEGACY_VAULTS_DIR/." "$TOPAZ_GEMS_DIR/"
    fi
  fi
fi

exec npx tsx server/hub-server.ts
