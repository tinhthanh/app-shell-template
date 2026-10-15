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

It is loaded before the app, read by `src/lib/api.ts`, and wins over the
env. Serve it `no-cache`. `mock: true` forces the fixtures, for a demo.

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
isn't the server's refusal). It logs to the console until `setReporter`
is called with your client. Build with `SOURCEMAPS=1` for hidden source
maps to upload alongside; they are not served.

## Hosts

- **GitHub Pages**: `.github/workflows/pages.yml` builds and publishes
  `dist/` on every push to `main`.
- **A container**: `deploy/Dockerfile` serves `dist/` with nginx and the
  headers above; `API_URL` at start writes `config.js`, and without it the
  container refuses to start unless `MOCK=1`.

## Releases

`node scripts/release.mjs X.Y.Z` bumps the version and dates the changelog;
after its PR merges, a tag `vX.Y.Z` makes `.github/workflows/release.yml`
build and publish a GitHub release with `dist` attached. The size budget
(`pnpm check:size`) and the bundle's licence file
(`dist/third-party-licenses.md`) come with every build.
