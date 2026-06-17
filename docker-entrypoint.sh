#!/bin/sh
set -e
export TOPAZ_NO_BONJOUR=true
export TOPAZ_DATA_DIR="${TOPAZ_DATA_DIR:-/data}"
export TOPAZ_VAULTS_DIR="${TOPAZ_VAULTS_DIR:-/data/vaults}"
mkdir -p "$TOPAZ_VAULTS_DIR"
exec npx tsx server/hub-server.ts
