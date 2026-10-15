// Posts Markdown from stdin as a pull request comment, one per PR: a
// comment that carries the first line's marker (<!-- ci-failures -->) is
// updated, not added to, so a PR that fails five times has one comment.
// Needs GITHUB_TOKEN, GITHUB_REPOSITORY and PR_NUMBER in env (the
// workflow sets them); nothing of the PR's text reaches a shell.
//
//   node scripts/ci-failures.mjs … | node scripts/ci-comment.mjs
const body = await new Promise((r) => {
  let s = "";
  process.stdin.on("data", (d) => (s += d));
  process.stdin.on("end", () => r(s));
});
const marker = body.split("\n")[0];
const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo, PR_NUMBER: pr } = process.env;
if (!token || !repo || !pr) {
  console.log("ci-comment: not on a pull request, or no token; the summary stays in the job summary");
  process.exit(0);
}
const api = `https://api.github.com/repos/${repo}`;
const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
const existing = await (await fetch(`${api}/issues/${pr}/comments?per_page=100`, { headers })).json();
const mine = Array.isArray(existing) ? existing.find((c) => typeof c.body === "string" && c.body.startsWith(marker)) : undefined;
const res = mine
  ? await fetch(`${api}/issues/comments/${mine.id}`, { method: "PATCH", headers, body: JSON.stringify({ body }) })
  : await fetch(`${api}/issues/${pr}/comments`, { method: "POST", headers, body: JSON.stringify({ body }) });
if (!res.ok) {
  console.error(`ci-comment: GitHub answered ${res.status}; the summary is in the job summary`);
  process.exit(0);
}
console.log(`ci-comment: ${mine ? "updated" : "posted"} the comment on #${pr}`);
