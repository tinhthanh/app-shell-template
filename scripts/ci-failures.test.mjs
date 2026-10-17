// The CI failure summary: Playwright's JUnit file in, Markdown out.
import assert from "node:assert/strict";
import { test } from "node:test";

import { failures, report } from "./ci-failures.mjs";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites id="" name="" tests="3" failures="2">
<testsuite name="shell.spec.ts" timestamp="2026-10-15" hostname="chromium" tests="2" failures="1" time="3">
<testcase name="the sidebar folds to a rail" classname="e2e/shell.spec.ts" time="1.2">
</testcase>
<testcase name="a right-to-left page mirrors: the sidebar sits on the &quot;right&quot;" classname="e2e/shell.spec.ts" time="2.1">
<failure message="shell.spec.ts:325:1 a right-to-left page mirrors" type="FAILURE">
<![CDATA[  1) e2e/shell.spec.ts:325:1 › a right-to-left page mirrors

    \u001b[31mError: expect(locator).toHaveAttribute(expected) failed\u001b[39m

    Locator: getByRole('separator')
]]>
</failure>
</testcase>
</testsuite>
<testsuite name="projects.spec.ts" tests="1" failures="1">
<testcase name="a slow server shows the loader" classname="projects.spec.ts" time="30">
<failure message="timeout" type="FAILURE"><![CDATA[    Test timeout of 30000ms exceeded.]]></failure>
</testcase>
</testsuite>
</testsuites>
`;

test("each failed test is named with its spec and the error's own line, colours taken out", () => {
  const list = failures(XML);
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], { file: "e2e/shell.spec.ts", name: 'a right-to-left page mirrors: the sidebar sits on the "right"', message: "Error: expect(locator).toHaveAttribute(expected) failed" });
  assert.equal(list[1].message, "Test timeout of 30000ms exceeded.");
  // Playwright's classname is from the test folder; the report gives the path from the root.
  assert.equal(list[1].file, "e2e/projects.spec.ts");
});

test("the report carries the marker first, the failed step, and the command to run a spec", () => {
  const md = report(failures(XML), "Run pnpm exec playwright test");
  assert.ok(md.startsWith("<!-- ci-failures -->\n"));
  assert.match(md, /The \*\*Run pnpm exec playwright test\*\* step failed/);
  assert.match(md, /2 browser tests failed/);
  assert.match(md, /`e2e\/projects\.spec\.ts` › a slow server shows the loader/);
  assert.match(md, /pnpm test:e2e/);
});

test("with no browser failure the report points at the job log", () => {
  const md = report([], "Run pnpm lint");
  assert.match(md, /No browser test failed/);
  assert.doesNotMatch(md, /browser tests? failed \(/);
});
