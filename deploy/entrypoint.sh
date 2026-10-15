#!/bin/sh
# Writes config.js from the environment at start (docs/deploy.md), and
# refuses to serve an app nobody configured unless MOCK=1 says so.
set -e
if [ -z "$API_URL" ] && [ "$MOCK" != "1" ]; then
  echo "refusing to start: set API_URL (the API's origin), or MOCK=1 to serve the fixtures" >&2
  exit 1
fi
mock=false; [ "$MOCK" = "1" ] && mock=true
cat > /usr/share/nginx/html/config.js <<CFG
window.__APP_CONFIG__ = { apiUrl: "${API_URL}", mock: ${mock} };
CFG
