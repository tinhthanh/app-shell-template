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
| `reportUrl` | Where unexpected errors are POSTed, as JSON, with `sendBeacon` (`ErrorReport` in `src/lib/report.ts`) |
| `analyticsUrl` | Where usage events are POSTed, as JSON, for people who turned on Settings › General › Share usage data (`EVENTS` in `src/lib/analytics.ts`) |

Each URL's origin must be in the CSP's `connect-src`; the container puts
it there.

With neither set, the app runs on its fixtures and, away from localhost,
shows a banner saying so. The URL knobs (`?mock=1`, `?api=`, `?crash=`)
are read only in development or in a build made with `VITE_KNOBS=1`.

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
```

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
Build with `SOURCEMAPS=1` for hidden source maps to upload alongside; they
are not served.

## Usage data

Nothing is sent unless the host names an `analyticsUrl` **and** the person
turns on Share usage data (Settings › General, off by default) **and**
their browser doesn't send Global Privacy Control. What may be sent is the
one table `EVENTS` in `src/lib/analytics.ts`, each event with the
properties it names and no others: never a name, an id or what was typed
(ADR 0015). Add an event there, then `track("…", { … })` where it happens.

## Hosts

- **GitHub Pages**: `.github/workflows/pages.yml` builds and publishes
  `dist/` on every push to `main`.
- **A container**: `deploy/Dockerfile` serves `dist/` with nginx and the
  headers above; `API_URL` at start writes `config.js`, and without it the
  container refuses to start unless `MOCK=1`. `REPORT_URL` and
  `ANALYTICS_URL`, when given, go into `config.js` too, and their origins
  into `connect-src`; each must be a plain http(s) URL.

## Releases

`node scripts/release.mjs X.Y.Z` bumps the version and dates the changelog;
after its PR merges, a tag `vX.Y.Z` makes `.github/workflows/release.yml`
build and publish a GitHub release with `dist` attached. The size budget
(`pnpm check:size`) and the bundle's licence file
(`dist/third-party-licenses.md`) come with every build.
