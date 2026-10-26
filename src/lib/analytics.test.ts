// node --experimental-strip-types --test src/lib/analytics.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { mayShare, startAnalytics, stopAnalytics, track } from "./analytics.ts";

const about = () => ({ version: "1.0.0", language: "vi" });

test("nothing is sent before analytics starts", () => {
  stopAnalytics();
  assert.doesNotThrow(() => track("palette.open"));
});

test("an event goes to the collector with only the properties its table names, while the person allows it", () => {
  const sent: unknown[] = [];
  let allowed = true;
  startAnalytics(
    "https://usage.test",
    () => allowed,
    about,
    (_url, body) => sent.push(JSON.parse(body)) > 0,
  );
  track("record.status", { kind: "project", status: "paused" });
  // A property the table doesn't name doesn't leave.
  track("view.open", { kind: "projects", name: "Shop" } as never);
  allowed = false;
  track("palette.open");
  assert.deepEqual(sent, [
    { event: "record.status", props: { kind: "project", status: "paused" }, ...about() },
    { event: "view.open", props: { kind: "projects" }, ...about() },
  ]);
  stopAnalytics();
});

test("a browser that sends Global Privacy Control isn't tracked", () => {
  assert.equal(mayShare({ globalPrivacyControl: true }), false);
  assert.equal(mayShare({}), true);
  assert.equal(mayShare(undefined), true);
});
