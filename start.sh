#!/bin/bash
set -e

cd /var/www/anystats

if [ ! -f ".next/BUILD_ID" ]; then
  echo "[anystats] Geen geldige build gevonden — bezig met bouwen..."
  npm run build
  echo "[anystats] Build klaar."
fi

exec node node_modules/.bin/next start
