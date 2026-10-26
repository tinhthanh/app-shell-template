import { expect, mod, test } from "./fixtures";

// The frame's shared pieces, after Shipyard's: a place's count, the
// notification centre, the sidebar's Recent, the status bar's items (offline)
// and Home's getting-started list.

test("a place shows its count once its list has been read", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
  // On the rail a count is a quiet dot (loud ones are numbered); the count rides with it.
  await expect(app.page.getByTestId("place-badge-projects")).toHaveAttribute("data-count", "8");
});

test("a status change lands in the notification centre, unread, with a way back to the project", async ({ app }) => {
  await app.open({ hash: "/projects/p-shop" });
  await app.page.getByTestId("project-detail").getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Shop is now paused" })).toBeVisible();
  await expect(app.page.getByTestId("notifications-unread")).toHaveText("1");
  await app.nav("home").click();
  await app.page.getByTestId("notifications").click();
  const centre = app.page.getByTestId("notification-centre");
  await expect(centre.getByTestId("notice")).toContainText("Shop is now paused");
  await expect(app.page.getByTestId("notifications-unread")).toHaveCount(0);
  await centre.getByRole("button", { name: "Open" }).click();
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
});

test("a project opened goes under Recent, which folds and stays folded after a reload", async ({ app }) => {
  await app.open({ hash: "/projects/p-api" });
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Public API", exact: true })).toBeVisible();
  // Away from Projects (whose sheet lists the projects), the sheet shows Recent.
  await app.nav("home").click();
  const recent = app.page.getByTestId("recent");
  await expect(recent.getByTestId("recent-project-p-api")).toHaveText("Public API");
  await recent.getByTestId("recent-project-p-api").click();
  await expect(app.page).toHaveURL(/#\/projects\/p-api$/);
  await app.nav("home").click();
  await app.page.getByTestId("recent-fold").click();
  await expect(recent.getByTestId("recent-project-p-api")).toHaveCount(0);
  await app.page.reload();
  await expect(app.page.getByTestId("recent-fold")).toHaveAttribute("aria-expanded", "false");
  expect(((await app.stored("app.prefs")) as { folded: string[] }).folded).toEqual(["recent"]);
});

test("a deleted project leaves Recent", async ({ app }) => {
  await app.open({ hash: "/projects/p-api" });
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Public API", exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Delete" }).click();
  await app.page.getByTestId("confirm").getByRole("button", { name: "Delete" }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "was deleted" })).toBeVisible();
  await app.nav("home").click();
  await expect(app.page.getByTestId("recent-project-p-api")).toHaveCount(0);
  expect(((await app.stored("app.prefs")) as { recent: { id: string }[] }).recent.map((r) => r.id)).not.toContain("p-api");
});

test("after a sign-out, whoever signs in next sees none of the last person's notices or Recent", async ({ app }) => {
  await app.open({ hash: "/projects/p-shop" });
  await app.page.getByTestId("project-detail").getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.getByTestId("notifications-unread")).toHaveText("1");
  // From Home, so signing in again doesn't reopen the project (and put it back).
  await app.nav("home").click();
  await expect(app.page.getByTestId("recent-project-p-shop")).toBeVisible();
  await app.page.getByTestId("account").click();
  await app.page.getByRole("menuitem", { name: "Sign out" }).click();
  const signin = app.page.getByTestId("signin");
  await signin.getByRole("textbox", { name: "Email" }).fill("sam@acme.test");
  await signin.getByLabel("Password").fill("hunter2");
  await signin.getByRole("button", { name: "Sign in" }).click();
  await expect(signin).toHaveCount(0);
  await expect(app.nav("home")).toHaveAttribute("aria-current", "page");
  await expect(app.page.getByTestId("notifications-unread")).toHaveCount(0);
  await expect(app.page.getByTestId("recent-project-p-shop")).toHaveCount(0);
  await app.page.getByTestId("notifications").click();
  await expect(app.page.getByTestId("notification-centre").getByTestId("notice")).toHaveCount(0);
});

test("offline, the status bar says so, and back online the word goes", async ({ app }) => {
  await app.open();
  // Once the views' code is in: offline, the background load would fail mid-test.
  await expect(app.page.locator("html[data-views-loaded]")).toHaveCount(1);
  await app.context.setOffline(true);
  await expect(app.page.getByTestId("status-offline")).toHaveText("Offline");
  await app.context.setOffline(false);
  await expect(app.page.getByTestId("status-offline")).toHaveCount(0);
});

test("Home's getting-started list ticks each step as it is done, and once put away stays away", async ({ app }) => {
  await app.open();
  const list = app.page.getByTestId("getting-started");
  await expect(list.getByTestId("getting-started-progress")).toHaveText("0 of 3");
  await app.page.keyboard.press(`${mod()}+k`);
  await expect(app.page.getByTestId("command-palette")).toBeVisible();
  await app.page.keyboard.press("Escape");
  await expect(list.getByTestId("step-palette")).toHaveAttribute("data-done", "true");
  await expect(list.getByTestId("getting-started-progress")).toHaveText("1 of 3");
  await list.getByTestId("getting-started-dismiss").click();
  await expect(list).toHaveCount(0);
  await app.page.reload();
  await expect(app.page.getByTestId("nav-home")).toBeVisible();
  await expect(app.page.getByTestId("getting-started")).toHaveCount(0);
});

test("gone offline after the app has fetched its views, Projects and the sheet's list still open", async ({ app }) => {
  await app.open();
  await expect(app.page.locator("html[data-views-loaded]")).toHaveCount(1);
  await app.context.setOffline(true);
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects-column")).toBeVisible();
  await expect(app.page.getByTestId("projects")).toBeVisible();
  await app.context.setOffline(false);
});
