// After an Edit or Write, scripts/check-file.mjs formats the file in place
// and checks it alone: Biome's errors, titles, words, type sizes and the
// grid. What it finds goes back to the agent (exit 2) while the edit is
// fresh, rather than at the end of the turn when pnpm check runs. Reads the
// tool call from stdin as Claude Code sends it; silent when the file isn't
// one the checks read, or before pnpm install.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

let input = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) input += chunk;
let file;
try {
  file = JSON.parse(input).tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!file || !existsSync("node_modules/.bin/biome")) process.exit(0);
const run = spawnSync(process.execPath, ["scripts/check-file.mjs", file], { encoding: "utf8" });
if (run.status === 0) process.exit(0);
process.stderr.write(`${file} breaks a house rule (AGENTS.md › Rules); fix it now:\n\n${(run.stderr ?? "").trim()}\n`);
process.exit(2);
