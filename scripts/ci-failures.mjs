// What failed, in words an agent reading the PR can act on: the browser
// tests that failed (from Playwright's JUnit file) and the step that
// failed, as Markdown. CI writes it to the job summary and, on a pull
// request, into one comment it keeps updating (scripts/ci-comment.mjs).
//
//   node scripts/ci-failures.mjs [junit.xml] [failed step]
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MAX = 25;
// The terminal colours Playwright writes into its messages (ESC [ … m).
const COLOURS = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

// failures reads Playwright's JUnit file: each failed testcase with its
// spec, its name and the first lines of its message.
export function failures(xml) {
  const out = [];
  const cases = xml.matchAll(/<testcase\b([^>]*)>([\s\S]*?)<\/testcase>/g);
  for (const [, attrs, body] of cases) {
    if (!/<failure\b/.test(body)) continue;
    const name = /name="([^"]*)"/.exec(attrs)?.[1] ?? "?";
    const file = /classname="([^"]*)"/.exec(attrs)?.[1] ?? "?";
    const m = /<failure\b[^>]*>([\s\S]*?)<\/failure>/.exec(body)?.[1] ?? "";
    const text = m.replace(/^<!\[CDATA\[|\]\]>$/g, "").replace(COLOURS, "");
    const line =
      text
        .split("\n")
        .map((l) => l.trim())
        .find((l) => /^Error:|^Test timeout|^expect\(|^TimeoutError/.test(l)) ??
      text.trim().split("\n")[0] ??
      "";
    // Playwright names the spec from the test folder (projects.spec.ts):
    // the path from the root is what the command takes.
    out.push({ file: file.includes("/") || file === "?" ? file : `e2e/${file}`, name: decode(name), message: decode(line).slice(0, 300) });
  }
  return out;
}

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// report is the Markdown: a heading, the failed step, then the tests.
export function report(list, step) {
  const lines = ["<!-- ci-failures -->", "## CI: what failed", ""];
  if (step) lines.push(`The **${step}** step failed.`, "");
  if (list.length) {
    lines.push(`${list.length} browser test${list.length === 1 ? "" : "s"} failed (run them with \`E2E_PORT=1427 pnpm test:e2e <spec>\`):`, "");
    for (const f of list.slice(0, MAX)) lines.push(`- \`${f.file}\` › ${f.name}${f.message ? `\n  \`${f.message}\`` : ""}`);
    if (list.length > MAX) lines.push(`- …and ${list.length - MAX} more; the e2e-report artifact has them all.`);
  } else if (step) lines.push("No browser test failed; the step's own output says why (the job log).");
  lines.push("", "The e2e-report artifact holds the HTML report and the traces of the failed tests.");
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const file = process.argv[2] ?? "node_modules/.e2e-results/junit.xml";
  const list = existsSync(file) ? failures(readFileSync(file, "utf8")) : [];
  process.stdout.write(report(list, process.argv[3]));
}
