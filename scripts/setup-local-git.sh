#!/usr/bin/env bash
# Create a local bare git repo you can pull from (stays on your Mac, never public).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BARE="$HOME/Projects/Topaz.git"

cd "$ROOT"

if [ ! -d .git ]; then
  git init -b main
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -m "Topaz snapshot"
fi

if [ ! -d "$BARE" ]; then
  git init --bare "$BARE"
  echo "Created bare repo: $BARE"
fi

if ! git remote get-url origin &>/dev/null; then
  git remote add origin "$BARE"
elif [ "$(git remote get-url origin)" != "$BARE" ]; then
  git remote set-url origin "$BARE"
fi

git push -u origin main

echo ""
echo "Local repo ready."
echo "  Bare repo:  $BARE"
echo "  On this Mac: git clone $BARE ~/Projects/Topaz-copy"
echo ""
echo "From another machine on your LAN (replace YOUR_MAC_IP):"
echo "  git clone ssh://$(whoami)@YOUR_MAC_IP$HOME/Projects/Topaz.git Topaz"
echo "  — or copy the folder with AirDrop/USB and run: git clone /path/to/Topaz.git"
echo ""
echo "Windows (no npm): pull repo, then run installers/windows/Topaz-Setup.exe"
