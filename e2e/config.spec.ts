import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// What a deployment sets in config.js (lib/config.ts, docs/deploy.md): its
// flags, where errors go, and where usage goes for those who allow it. Each
// test serves its own config.js, and catches what the page sends on this
// origin, so nothing leaves the test.

async function serveConfig(page: Page, config: Record<string, unknown>) {
  await page.route("**/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: `window.__APP_CONFIG__ = ${JSON.stringify(config)};` }));
}

// collect answers what the page posts to path, and keeps it.
async function collect(page: Page, path: string): Promise<Record<string, unknown>[]> {
  const got: Record<string, unknown>[] = [];
  await page.route(`**${path}`, (r) => {
    got.push(JSON.parse(r.request().postData() ?? "{}"));
    return r.fulfill({ status: 204 });
  });
  return got;
}

test("a deployment can turn a feature off: Home has no getting-started list", async ({ app }) => {
  await serveConfig(app.page, { flags: { gettingStarted: false } });
  await app.open();
  await expect(app.page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(app.page.getByTestId("getting-started")).toHaveCount(0);
});

test("usage is sent only after the person turns it on, and their choice is kept", async ({ app }) => {
  await serveConfig(app.page, { analyticsUrl: "/collect/usage" });
  const sent = await collect(app.page, "/collect/usage");
  await app.open();
  const general = await app.openSettings("general");
  const share = general.getByTestId("share-usage");
  await expect(share).not.toBeChecked();
  await share.click();
  await expect(share).toBeChecked();
  expect(((await app.stored("app.prefs")) as { shareUsage: boolean }).shareUsage).toBe(true);
  // Nothing went before the yes (Settings itself was opened before it).
  expect(sent).toEqual([]);
  await app.page.getByTestId("settings-back").click();
  await app.nav("projects").click();
  // Back from Settings lands Home, then Projects: each view by its kind, and nothing else about it.
  await expect.poll(() => sent.filter((e) => e.event === "view.open").map((e) => e.props)).toEqual([{ kind: "home" }, { kind: "projects" }]);
});

test("without a collector there is no usage setting to turn on", async ({ app }) => {
  await app.open();
  const general = await app.openSettings("general");
  await expect(general.getByTestId("share-usage")).toHaveCount(0);
});

test("an error the app didn't expect goes to the host's collector, without the address's query", async ({ app }) => {
  app.allowConsoleError(/Crashed on purpose/);
  await serveConfig(app.page, { reportUrl: "/collect/errors" });
  const sent = await collect(app.page, "/collect/errors");
  await app.open({ params: { crash: "projects" }, hash: "/projects?q=private" });
  await expect(app.page.getByText("Something in Projects broke")).toBeVisible();
  await expect.poll(() => sent.length).toBeGreaterThan(0);
  expect(sent[0]).toMatchObject({ message: "Crashed on purpose (?crash=projects)", view: "#/projects", language: "en" });
});
