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

**Revisit if.** The app needs sessions across tabs without a cookie
(then: a refresh token in memory with a BroadcastChannel, still not
storage).
