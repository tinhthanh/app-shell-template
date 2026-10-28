# Deploying an app built from this template

The build (`pnpm build`) is one static folder, `dist/`: hashed assets,
relative paths (so it serves from the root or any folder), and hash
routing (so no rewrite rule). What a host adds is configuration, caching
and headers.

## Configuration at runtime

`VITE_API_URL` is baked into the build. For one build that runs against
many environments, the host writes `config.js` beside `index.html` (the
template ships `public/config.js` with an empty `apiUrl`):

```js
window.__APP_CONFIG__ = { apiUrl: "https://api.acme.example" };
```

It is loaded before the app, read by `src/lib/config.ts` (and nowhere
else), and wins over the env. Serve it `no-cache`. What it may hold:

| Key | What it does |
|---|---|
| `apiUrl` | The API's base, over `VITE_API_URL` |
| `mock` | `true` forces the fixtures, for a demo |
| `flags` | Features on or off for this deployment, over their defaults: `{ gettingStarted: false }` (`FLAGS` in `src/lib/flags.ts`; a name that isn't there is ignored) |
| `reportUrl` | Where unexpected errors are POSTed, as JSON (sent as `text/plain`, so a collector on another origin needs no CORS preflight; it reads the body as JSON), with `sendBeacon` (`ErrorReport` in `src/lib/report.ts`) |
| `analyticsUrl` | Where usage events are POSTed, as JSON, for people who turned on Settings › General › Share usage data (`EVENTS` in `src/lib/analytics.ts`) |

Each URL's origin must be in the CSP's `connect-src`; the container puts
it there.

With neither set, the app runs on its fixtures and, away from localhost,
shows a banner saying so. The URL knobs that change where the app reads
from or what it turns on (`?mock=1`, `?api=`, `?flags=`) are read only in
development or in a build made with `VITE_KNOBS=1` (`knobsOn` in
`src/lib/api.ts`). `?crash=` (`src/App.tsx`) and the mock's own knobs
(`?slow=1`, `?fail=1`, `?empty=1` and the rest, `src/lib/mock.ts`) work
whenever the app runs on its fixtures, in any build: they can't reach a
real API.

## Caching

- `assets/*`: hashed, so `Cache-Control: public, max-age=31536000, immutable`.
- `index.html` and `config.js`: `Cache-Control: no-cache`.
- A tab left open across a deploy reloads itself once when a lazy chunk
  has gone (`vite:preloadError` in `src/main.tsx`).

## Headers

`deploy/csp.txt` is the Content Security Policy the app runs under with no
`unsafe-inline`: every script and style is the app's own, except the one
inline script in `index.html` (the appearance before first paint), named
by its hash. `pnpm check:csp` recomputes the hash and fails when the
script changed. Replace `https://api.example.com` in `connect-src` with
your API's origin. Add:

```
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

`Strict-Transport-Security` belongs where TLS ends (the load balancer or
CDN in front of the container), not in the container, which serves plain
HTTP behind it: set `max-age=31536000; includeSubDomains` there. Trusted
Types (`require-trusted-types-for 'script'`) fits the app, which writes no
HTML as text, but turn it on only after a run in report-only mode
(`Content-Security-Policy-Report-Only`) shows nothing in the libraries
trips it.

A host that can't set headers (GitHub Pages) can put the same policy in a
`<meta http-equiv="Content-Security-Policy">` tag, minus `frame-ancestors`.

## Errors in production

`src/lib/report.ts` is where unexpected errors go: the error boundary,
`window.onerror`, unhandled rejections and `toastError` (for anything that
isn't the server's refusal). It logs to the console and, when `config.js`
names a `reportUrl`, POSTs each error once (at most ten a page) as JSON:
the message, the stack, where in the app, the view's path without its
query, the version, the commit and the language. Any collector that takes
JSON will do; for a vendor's client, call `setReporter` with it instead.
Build with `SOURCEMAPS=1` for hidden source maps to upload alongside: they
land in `dist/` beside the scripts, with no comment pointing at them, so
upload them and delete `dist/**/*.map` before serving. The release
tarball is built with `SOURCEMAPS=1`, so it holds them.

## Usage data

Nothing is sent unless the host names an `analyticsUrl` **and** the person
turns on Share usage data (Settings › General, off by default) **and**
their browser doesn't send Global Privacy Control. What may be sent is the
one table `EVENTS` in `src/lib/analytics.ts`, each event with the
properties it names and no others: never a name, an id or what was typed
(ADR 0015). Add an event there, then `track("…", { … })` where it happens.

## Hosts

- **GitHub Pages**: `.github/workflows/pages.yml` builds and publishes
  `dist/` on every push to `main`, once the repository variable `API_URL`
  names an API or `MOCK` is `1` (a demo on the fixtures, built with
  `VITE_KNOBS=1`). With neither, the job is skipped, not failed
  (`node scripts/setup-repo.mjs` says how to set them).
- **A container**: `deploy/Dockerfile` serves `dist/` with nginx and the
  headers above; `API_URL` at start writes `config.js`, and without it the
  container refuses to start unless `MOCK=1`. `REPORT_URL` and
  `ANALYTICS_URL`, when given, go into `config.js` too, and their origins
  into `connect-src`; each must be a plain http(s) URL. The entrypoint
  writes no `flags`: to turn features on or off, serve your own
  `config.js`. The image has no `.git`, so the commit in error reports is
  empty unless the build is given one:
  `docker build --build-arg APP_COMMIT=$(git rev-parse HEAD) -f deploy/Dockerfile .`

## The API

A backend implements `api/openapi.json`: every path the client calls
(`httpClient` in `src/lib/api.ts`), the session's included, and
`POST /session/refresh` (Stay signed in) with it. `pnpm check:contract`
holds the client and the mock to it (ADR 0016). Before there is a
backend, `pnpm stub` (`scripts/stub-server.mjs`) serves the mock over
HTTP on `http://localhost:8787` (`STUB_PORT` to move it); run the app
against it with `VITE_API_URL=http://localhost:8787 pnpm dev`.

Every write (POST, PATCH, DELETE) carries `X-Requested-With: XMLHttpRequest`.
With a session cookie, the server refuses a write without it: a form or a
script on another site can't set that header without the server's CORS
allowing it, so a cross-site request is turned away (CSRF). The cookie is
`HttpOnly; Secure; SameSite=Lax` as well (ADR 0011).

## Releases

`node scripts/release.mjs X.Y.Z` bumps the version in `package.json` and
dates the changelog; add the version's lines in plain words to
`WHATS_NEW` in `src/lib/whats-new-notes.ts` (the What's new dialog) in
the same PR. After it merges, push a tag `vX.Y.Z`: it must match
`package.json`'s version, or `.github/workflows/release.yml` stops. That
workflow runs `pnpm check`, builds (with `SOURCEMAPS=1`) and publishes a
GitHub release with `dist/` attached as `app-vX.Y.Z.tar.gz` and the
changelog's section as the notes. The size budget (`pnpm check:size`) and
the bundle's licence file (`dist/third-party-licenses.md`) come with
every build.
