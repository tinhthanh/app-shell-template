// node --test scripts/free-port.test.mjs (pnpm test)
// The port a browser run takes (free-port.mjs): E2E_PORT when set, else
// the first free one in 1421–1439, never the dev server's 1420.
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { test } from "node:test";
import { FIRST, freePort, LAST } from "./free-port.mjs";

// hold listens on the port until the test ends; false when it was taken.
const hold = (t, port) =>
  new Promise((done) => {
    const s = createServer()
      .once("error", () => done(false))
      .once("listening", () => {
        t.after(() => new Promise((r) => s.close(r)));
        done(true);
      });
    s.listen(port, "127.0.0.1");
  });

test("E2E_PORT is the port, as given", async () => {
  assert.equal(await freePort({ E2E_PORT: "1433" }), 1433);
});

test("without E2E_PORT, a free port in 1421–1439, never the dev server's 1420", async () => {
  const p = await freePort({});
  assert.ok(p >= FIRST && p <= LAST, `${p}`);
  assert.ok(FIRST > 1420);
});

test("a port something listens on is passed over for the next free one", async (t) => {
  const first = await freePort({});
  assert.ok(await hold(t, first));
  const next = await freePort({});
  assert.ok(next > first, `${next} after ${first}`);
});

test("with every port taken it says so, and how to get out of it", async (t) => {
  for (let p = FIRST; p <= LAST; p++) await hold(t, p);
  await assert.rejects(freePort({}), /no free port in 1421–1439; stop a run you started, or set E2E_PORT/);
});
