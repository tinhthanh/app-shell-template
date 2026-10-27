# 0002: The app runs on fixtures unless an API is named

**Status:** accepted, 2026-10-14

**Context.** The template has no backend, and the browser suite must be
fixed and quick. A view that talks to `fetch` directly can't be run or
tested without a server.

**Decision.** Every read and write goes through one `Client`
(`src/lib/api.ts`). With no API configured (no `VITE_API_URL`, and no
`apiUrl` in the host's `config.js`), with `mock: true` in `config.js`, or
with `?mock=1` in the URL, the client is `mockClient()` over synthetic
fixtures (`src/lib/mock.ts`), with URL knobs for latency, failures and
emptiness. The URL may choose the fixtures or an API (`?mock=1`, `?api=`)
only while the knobs are on: a dev build, or one built with
`VITE_KNOBS=1` (`knobsOn()`); a production build ignores them, so a link
can't point the app elsewhere. Biome refuses `fetch` and
the storage globals outside their modules.

**Consequences.** `pnpm dev`, CI and the Kit page need no server. The
e2e fixture aborts any request off the page, so a test can't depend on a
network. A production build with the API forgotten serves fixtures, but
not silently: away from localhost, with the knobs off, a banner across the
top (`mock-banner`) says the data is made up and how to configure an API;
the status bar says "mock", and Settings › About says "mock fixtures".

**Revisit if.** The app needs a real API in the browser suite. The
contract test layer this pointed to now exists (ADR 0016: `api/openapi.json`,
`pnpm check:contract`, `pnpm stub` and `e2e/contract.spec.ts`), so the
answer is still that, not live calls.
