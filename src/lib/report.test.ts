// node --experimental-strip-types --test src/lib/report.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { beaconReporter, benign, both, MAX_REPORTS, report, setReporter, viewPath } from "./report.ts";

test("a reporter gets the error and its context, and one that throws is contained", () => {
  const got: unknown[] = [];
  setReporter((e, c) => got.push([e, c]));
  const err = new Error("x");
  report(err, { scope: "Projects" });
  assert.deepEqual(got, [[err, { scope: "Projects" }]]);
  setReporter(() => {
    throw new Error("the reporter is down");
  });
  assert.doesNotThrow(() => report(err));
});

const about = () => ({ view: "#/projects", version: "1.0.0", commit: "abc", language: "en" });

test("an error goes to the collector once, as JSON with where it happened and which build", () => {
  const sent: [string, unknown][] = [];
  const r = beaconReporter("https://errors.test/in", about, (url, body) => sent.push([url, JSON.parse(body)]) > 0);
  const err = new Error("boom");
  r(err, { scope: "Projects" });
  r(err, { scope: "Projects" });
  r("a string", undefined);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0]?.[1], { message: "boom", stack: err.stack, context: { scope: "Projects" }, ...about() });
  assert.equal((sent[1]?.[1] as { message: string } | undefined)?.message, "a string");
});

test("a page sends at most MAX_REPORTS errors, however many it throws", () => {
  let n = 0;
  const r = beaconReporter("u", about, () => ++n > 0);
  for (let i = 0; i < MAX_REPORTS * 3; i++) r(new Error(`e${i}`));
  assert.equal(n, MAX_REPORTS);
});

test("the address reported is the view's path, never its query", () => {
  assert.equal(viewPath("#/projects?q=acme&token=x"), "#/projects");
  assert.equal(viewPath(""), "#/");
});

test("both tells each reporter", () => {
  const got: string[] = [];
  both(
    () => got.push("a"),
    () => got.push("b"),
  )(new Error("x"));
  assert.deepEqual(got, ["a", "b"]);
});

test("the browser's ResizeObserver noise isn't an error to report; anything else is", () => {
  assert.equal(benign("ResizeObserver loop completed with undelivered notifications."), true);
  assert.equal(benign("ResizeObserver loop limit exceeded"), true);
  assert.equal(benign("Cannot read properties of undefined"), false);
  assert.equal(benign(undefined), false);
});
