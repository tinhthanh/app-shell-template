// Before the agent stops with changes in the tree, the checks run. Red
// checks block the stop (exit 2) with their last lines on stderr, so the
// agent fixes them instead of finishing. stop_hook_active is true when a
// stop was already blocked once: then let it through, so a check that
// cannot pass doesn't loop forever.
import { spawnSync } from "node:child_process";

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;
try {
  if (JSON.parse(input).stop_hook_active) process.exit(0);
} catch {
  // No JSON: run the checks anyway.
}

const status = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
if (status.status !== 0 || !status.stdout.trim()) process.exit(0);

const pnpm = spawnSync("sh", ["-c", "command -v pnpm >/dev/null 2>&1 && echo pnpm || echo 'npx pnpm@11'"], { encoding: "utf8" }).stdout.trim();
const run = spawnSync("sh", ["-c", `${pnpm} -s check 2>&1`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (run.status === 0) process.exit(0);
const tail = (run.stdout ?? "").split("\n").filter(Boolean).slice(-40).join("\n");
process.stderr.write(`pnpm check is red; fix it before you stop (AGENTS.md › Done means):\n\n${tail}\n`);
process.exit(2);
