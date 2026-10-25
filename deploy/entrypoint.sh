#!/bin/sh
# Writes config.js from the environment at start (docs/deploy.md), puts the
# API's origin in the CSP's connect-src (security.conf's __API_ORIGIN__), and
# refuses to serve an app nobody configured unless MOCK=1 says so. HTML_DIR
# and SECURITY_CONF are where nginx keeps them (scripts/deploy.test.mjs
# points them at a scratch folder).
set -e
html="${HTML_DIR:-/usr/share/nginx/html}"
conf="${SECURITY_CONF:-/etc/nginx/security.conf}"
if [ -z "$API_URL" ] && [ "$MOCK" != "1" ]; then
  echo "refusing to start: set API_URL (the API's origin), or MOCK=1 to serve the fixtures" >&2
  exit 1
fi
# A URL and nothing else: it goes into a script and a header as it is.
if [ -n "$API_URL" ] && ! printf '%s' "$API_URL" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/-]*)?$'; then
  echo "refusing to start: API_URL must be an http(s) URL such as https://api.acme.example (got: $API_URL)" >&2
  exit 1
fi
origin=$(printf '%s' "$API_URL" | sed -E 's#^(https?://[^/]+).*#\1#')
mock=false; [ "$MOCK" = "1" ] && mock=true
cat > "$html/config.js" <<CFG
window.__APP_CONFIG__ = { apiUrl: "${API_URL}", mock: ${mock} };
CFG
sed -i.bak "s#__API_ORIGIN__#${origin}#" "$conf" && rm -f "$conf.bak"
