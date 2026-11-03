// The port a browser run serves the build on: E2E_PORT when it is set, else
// the first free one in 1421–1439 (1420 is the dev server's). Two runs in two
// worktrees then each find their own, with nobody picking one by hand.
// scripts/shots.mjs imports it; playwright.config.ts runs it once in the
// main process and hands the answer to its workers through E2E_PORT.
//
//   node scripts/free-port.mjs    prints the port
import { createServer } from "node:net";

export const FIRST = 1421;
export const LAST = 1439;

// free answers whether nothing listens on the port.
const free = (port) =>
  new Promise((done) => {
    const s = createServer()
      .once("error", () => done(false))
      .once("listening", () => s.close(() => done(true)));
    s.listen(port, "127.0.0.1");
  });

// freePort is E2E_PORT, or the first free port in FIRST–LAST.
export async function freePort(env = process.env) {
  if (env.E2E_PORT) return Number(env.E2E_PORT);
  for (let p = FIRST; p <= LAST; p++) if (await free(p)) return p;
  throw new Error(`no free port in ${FIRST}–${LAST}; stop a run you started, or set E2E_PORT`);
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await freePort());
