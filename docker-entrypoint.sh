#!/bin/sh
set -e
mkdir -p /data/vaults
exec npx tsx server/hub-server.ts
