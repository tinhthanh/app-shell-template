// Around a shell command, so a file written from the shell (a heredoc,
// sed -i, a script) is checked as an Edit is (after-edit.mjs): `before`
// notes the time, `after` runs scripts/check-file.mjs on each file git sees
// changed since, and what they find goes back to the agent (exit 2) while
// the change is fresh. Trial 3 wrote nearly all of its code that way, and
// the edit hook saw two files. Silent before pnpm install.
//
//   node .claude/hooks/around-bash.mjs before|after
import { spawnSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";

// The stamp lives in node_modules, which git ignores, so it is never a change itself.
const stamp = "node_modules/.claude-bash-stamp";
// A command that rewrites more than this (a checkout, pnpm format) is left to pnpm check at the stop.
const most = 40;

for await (const _ of process.stdin); // Claude Code sends the call; nothing in it is needed
if (!existsSync("node_modules/.bin/biome")) process.exit(0);

if (process.argv[2] === "before") {
  writeFileSync(stamp, "");
  process.exit(0);
}
if (!existsSync(stamp)) process.exit(0);

const since = statSync(stamp).mtimeMs;
const listed = spawnSync("git", ["ls-files", "--modified", "--others", "--exclude-standard", "-z"], { encoding: "utf8" });
const changed = (listed.stdout ?? "")
  .split("\0")
  .filter((f) => f && /\.(ts|tsx|mjs|json)$/.test(f) && existsSync(f) && statSync(f).mtimeMs >= since);
if (changed.length === 0 || changed.length > most) process.exit(0);

const said = changed.flatMap((file) => {
  const run = spawnSync(process.execPath, ["scripts/check-file.mjs", file], { encoding: "utf8" });
  return run.status === 0 ? [] : [`${file} breaks a house rule (AGENTS.md › Rules); fix it now:\n\n${(run.stderr ?? "").trim()}`];
});
if (said.length === 0) process.exit(0);
process.stderr.write(`${said.join("\n\n")}\n`);
process.exit(2);
