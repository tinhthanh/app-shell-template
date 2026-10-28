# 0015: Usage data is opt-in, and what may leave is one table

**Status:** accepted, 2026-10-26

**Context.** Teams building on the template want to know which pages and
actions are used, and to hear about errors in production. Both send data
off the device; the first is about what people do.

**Decision.** Errors go to config.js's `reportUrl` (lib/report.ts): the
message, the stack, the view's path without its query, the build and the
language, each message once, ten a page at most. Usage goes to
`analyticsUrl` (lib/analytics.ts) only while three things hold: the host
named a collector, the person turned on Share usage data (off by default,
`prefs.shareUsageFor`, the id of the person who said yes, so it is never
someone else's on a shared machine and outlives their own session; asked
again on every event), and the browser doesn't
send Global Privacy Control. `EVENTS` is the one table of events and the
properties each may carry (a view's kind, a record's kind and status);
`track()` sends those and drops anything else, so a caller can't leak a
name, an id or a search. Both POST JSON with `sendBeacon` to a URL of the
host's: no vendor's SDK, no cookie of ours, and the container puts the
origins in `connect-src`.

Web Vitals (LCP, CLS, INP; `lib/vitals.ts`) go the same way, as ratings
only ("good", "poor") and the view's kind, never a raw time.

**Consequences.** Without a collector there is no setting to see. A
product that needs consent before anything else (a banner) builds it on
`shareUsageFor`. A vendor's client (Sentry, PostHog) plugs in through
`setReporter` or a `startAnalytics` of its own, and its script origin then
goes in the CSP.

**Revisit if.** The app needs per-person identity in analytics (then: a
pseudonymous id the server issues, never one from storage), or the law
where it runs asks for more than an off-by-default switch.
