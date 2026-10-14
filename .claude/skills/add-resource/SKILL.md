---
name: add-resource
description: Add a resource the app reads and writes through the API client, with fixtures, a mock, tests and a view that draws its states. Use when asked to show or edit a new kind of data.
---

# Add a resource

Everything the app reads goes through one `Client` (`src/lib/api.ts`)
with a mock twin (`src/lib/mock.ts`), so the view, the browser suite and
the Kit run without a server. `Project` is the worked example.

1. **`src/lib/types.ts`**: the type (this file stays import-free). Modules that node runs import it as `import type { … } from "@/lib/types"` or `"./types.ts"`: a type-only import is erased, so either is fine.
2. **`src/lib/api.ts`**: methods on `Client`, and their paths in `httpClient` (`GET /reports`, `GET /reports/:id`, `PATCH /reports/:id`).
3. **`src/lib/mock.ts`**: fixtures (synthetic, "acme"; no real names, URLs or emails) as a second `let` beside `projects`, honouring `opts.empty`; and the methods on `mockClient`'s object, each starting with `await guard()` (`guard(true)` for a write) so `slow`, `fail`, `failOnce` and `failWrites` apply, and returning `structuredClone`s. Refuse what a server would (an empty or taken name) with `new ApiError(message, 422, "invalid")`.
4. **`src/lib/mock.test.ts`**: read, read one, a 404, a refused write, `fail`.
5. **`src/lib/api.test.ts`**: the paths and method of each new call against the stubbed `fetch`.
6. **The view** (see the `add-view` skill): `const reports = useResource(() => client.reports(), [])`, drawn with `<ResourceView resource={reports} label="Reading reports…" testid="reports" isEmpty={…} empty={…}>{(reports) => …}</ResourceView>`, which draws loading, failed (with Try again) and empty for you; writes with `toastError` on failure, a 422 with code `invalid` shown on the field (`Form` + `Field` as in the project edit dialog), `confirm()` before anything irreversible.
7. **`e2e/reports.spec.ts`**: the list from the fixtures; `slow=1` shows the loader, `fail=1` the error note with Try again, `empty=1` the empty state, `failOnce=1` recovers, `failWrites=1` toasts.

Then `pnpm check` and the specs.
