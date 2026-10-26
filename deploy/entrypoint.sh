#!/bin/sh
# Writes config.js from the environment at start (docs/deploy.md), puts the
# origins the page may reach (the API, and the error and usage collectors
# when given) in the CSP's connect-src (security.conf's __API_ORIGIN__), and
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
plain() {
  if [ -n "$2" ] && ! printf '%s' "$2" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~/-]*)?$'; then
    echo "refusing to start: $1 must be an http(s) URL such as https://api.acme.example (got: $2)" >&2
    exit 1
  fi
}
plain API_URL "$API_URL"
plain REPORT_URL "$REPORT_URL"
plain ANALYTICS_URL "$ANALYTICS_URL"
origin_of() { printf '%s' "$1" | sed -E 's#^(https?://[^/]+).*#\1#'; }
origins=""
for u in "$API_URL" "$REPORT_URL" "$ANALYTICS_URL"; do
  [ -z "$u" ] && continue
  o=$(origin_of "$u")
  case " $origins " in *" $o "*) ;; *) origins="${origins:+$origins }$o" ;; esac
done
mock=false; [ "$MOCK" = "1" ] && mock=true
extra=""
[ -n "$REPORT_URL" ] && extra="$extra, reportUrl: \"${REPORT_URL}\""
[ -n "$ANALYTICS_URL" ] && extra="$extra, analyticsUrl: \"${ANALYTICS_URL}\""
cat > "$html/config.js" <<CFG
window.__APP_CONFIG__ = { apiUrl: "${API_URL}", mock: ${mock}${extra} };
CFG
sed -i.bak "s#__API_ORIGIN__#${origins}#" "$conf" && rm -f "$conf.bak"
