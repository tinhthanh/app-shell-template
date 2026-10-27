# 0016: The API is a contract file the client and the mock are held to

**Status:** accepted, 2026-10-26

**Context.** The app runs on its mock until a server exists, and the
server is often built by another team. With nothing between them, the
client's paths, the mock's answers and the server drift apart, and the
first time anyone notices is the day the app meets the real API.

**Decision.** `api/openapi.json` (OpenAPI 3.1, JSON so no parser is needed)
names every call the app makes: each `Client` method is an operation whose
`operationId` is the method's name, with its path, query, bodies and
response schema. `pnpm check:contract` (part of `pnpm check`) holds the app
to it: every method is an operation and every operation a method, with the
HTTP method and path `httpClient` sends; the query and body types the
client sends (`QUERIES`, `BODIES`) have the fields the operation's
parameters and request body name; and the mock, called with a sample
request per operation (`SAMPLES`, `scripts/contract.mjs`), answers what the
response schema says, its refusals in the `Error` shape the client reads.
`pnpm stub` serves the mock over HTTP by the same file
(`scripts/stub-server.mjs`), so the real client runs end to end, and
`e2e/contract.spec.ts` does that in the browser suite.

**Consequences.** A new call is four edits that must agree (the contract,
the client, the mock, and its `ARGS` and `SAMPLES` in `scripts/contract.mjs`),
and the check says which one is wrong. The schema
check is the subset the contract uses (types, required, enum, `$ref`,
`allOf`, `anyOf`, `items`, `minimum`, `additionalProperties: false`,
date-time and date), a few dozen lines with
no dependency; a contract that needs more grows it, with a test. The
contract is the thing to hand a backend team, and a generator can make a
server skeleton or a client from it.

**Revisit if.** The server already publishes its OpenAPI: then fetch it,
check the client against that one, and generate the types from it rather
than writing them twice.
