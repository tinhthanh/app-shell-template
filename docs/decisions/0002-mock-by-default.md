# 0002: The app runs on fixtures unless an API is named

**Status:** accepted, 2026-10-14

**Context.** The template has no backend, and the browser suite must be
fixed and quick. A view that talks to `fetch` directly can't be run or
tested without a server.

**Decision.** Every read and write goes through one `Client`
(`src/lib/api.ts`). With `?mock=1` in the URL, or no `VITE_API_URL`, the
client is `mockClient()` over synthetic fixtures (`src/lib/mock.ts`), with
URL knobs for latency, failures and emptiness. Biome refuses `fetch` and
the storage globals outside their modules.

**Consequences.** `pnpm dev`, CI and the Kit page need no server. The
e2e fixture aborts any request off the page, so a test can't depend on a
network. A production build with the env var forgotten serves fixtures
silently: the status bar says "mock", and Settings › About says "mock
fixtures".

**Revisit if.** The app needs a real API in the browser suite (then: a
contract test layer, not live calls).
