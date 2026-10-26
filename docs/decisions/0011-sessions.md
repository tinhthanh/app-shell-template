# 0011: Sessions are a cookie by default, and never in storage

**Status:** accepted, 2026-10-15

**Context.** Almost every app built from the template needs to know who
is signed in, send that with every call, and land on a sign-in page when
the server says 401. A token in `localStorage` is readable by any script
on the page.

**Decision.** `lib/session.ts` holds who is signed in, in memory, for the
page's life. The HTTP client sends `credentials: "include"` so an httpOnly
session cookie travels with every call; a server that wants a bearer
token gets it from `httpClient`'s `headers()` hook, from memory, never
from storage. Any 401 calls `signedOut()`, which forgets what was read
and shows the sign-in view over the app; the view in front stays what it
was, so signing in returns there. The mock has `?signedOut=1`, a fixture
user and a sign-in that refuses an empty password.

**Consequences.** A reload asks `me()` again (one request). The API must
set the cookie with `SameSite` and CORS `credentials` right. There is no
"remember me" beyond what the cookie's lifetime gives.

**Since (2026-10-26).** A 401 first asks `POST /session/refresh` once (the
server's refresh cookie, httpOnly; `ClientOptions.refreshPath`, null to
turn it off) and tries the call again; only a refused ask signs out. A
server that ends sessions says when (`User.sessionEndsAt`): two minutes
before, a toast offers Stay signed in (`client.refreshSession()`), and at
the end the person is signed out, the sign-in page saying why
(`hooks/use-session-end.ts`). Tabs agree through a BroadcastChannel
(`lib/tabs.ts`): a sign-out in one signs out every one, a sign-in has a
tab on the sign-in page ask `me()` again. Still nothing in storage.

**Revisit if.** The app needs sessions without a cookie at all (then: a
refresh token in memory, handed between tabs over the same channel, still
not storage).
