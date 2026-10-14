// After an Edit or Write, Biome formats the file in place, so formatting
// never reaches a commit or CI. Reads the tool call from stdin as Claude
// Code sends it; silent when the file isn't one Biome handles.
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
if (!file || !/\.(ts|tsx|mjs|json)$/.test(file) || !existsSync(file) || !existsSync("node_modules/.bin/biome")) process.exit(0);
spawnSync("node_modules/.bin/biome", ["check", "--write", "--no-errors-on-unmatched", file], { stdio: "ignore" });
