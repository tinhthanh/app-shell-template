import { expect, mod, test } from "./fixtures";

// The sidebar's rail (components/sidebar-rail.tsx): the places pinned to
// it and the rest under its "…", the person's workspaces as tiles, and the
// sheet beside it showing the workspace on show and the place's own list.

test("picking another workspace on the rail lists its projects, and a reload stays there", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await expect(app.page.getByTestId("project-row")).toHaveCount(8);
  await expect(app.page.getByTestId("workspace-header")).toContainText("Acme");
  await app.page.locator("[data-testid=rail-workspace][data-workspace=w-globex]").click();
  await expect(app.page.getByTestId("workspace-header")).toContainText("Globex");
  await expect(app.page.getByTestId("project-row")).toHaveCount(2);
  await expect(app.page.getByTestId("projects-column").getByTestId("column-project")).toHaveCount(2);
  await app.page.reload();
  await expect(app.page.getByTestId("workspace-header")).toContainText("Globex");
  await expect(app.page.locator("[data-testid=rail-workspace][data-workspace=w-globex]")).toHaveAttribute("aria-current", "true");
});

test("a workspace with something waiting wears a dot, and its name says so", async ({ app }) => {
  await app.open();
  const globex = app.page.locator("[data-testid=rail-workspace][data-workspace=w-globex]");
  await expect(globex).toHaveAttribute("aria-label", "Globex, 1 waiting");
  await expect(app.page.getByTestId("rail-workspace-dot")).toHaveCount(1);
});

test("a new workspace is made from the rail, and shows", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await app.page.getByTestId("new-workspace").click();
  const dialog = app.page.getByRole("dialog", { name: "New workspace" });
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByText("A workspace needs a name.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Name" }).fill("Initech");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(app.page.getByTestId("workspace-header")).toContainText("Initech");
  await expect(app.page.getByTestId("projects-empty")).toBeVisible();
  // The keyboard is on the new tile, not back on "+".
  await expect(app.page.locator("[data-testid=rail-workspace][data-workspace=w-initech]")).toBeFocused();
});

test("the sheet lists the workspace's projects while the list beside it is filtered", async ({ app }) => {
  await app.open({ hash: "/projects?status=paused" });
  await expect(app.page.getByTestId("project-row")).toHaveCount(1);
  await expect(app.page.getByTestId("projects-column").getByTestId("column-project")).toHaveCount(8);
});

test("when the workspaces can't be read, the projects say so, with a way to try again", async ({ app }) => {
  await app.open({ params: { fail: "1" }, hash: "/projects" });
  const failed = app.page.getByTestId("projects-failed");
  await expect(failed).toBeVisible();
  await expect(failed.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("a place's count is part of its name on the rail", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
  await expect(app.nav("projects")).toHaveAttribute("aria-label", "Projects, 8");
});

test("a project opened from another workspace brings its workspace with it", async ({ app }) => {
  await app.open({ hash: "/projects/p-billing" });
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Billing", exact: true })).toBeVisible();
  await expect(app.page.getByTestId("workspace-header")).toContainText("Globex");
  // The sheet lists Globex's projects, with the open one lit.
  await expect(app.page.locator("[data-testid=column-project][data-project=p-billing]")).toHaveAttribute("aria-current", "page");
});

test("the rail's … unpins a place, which is still there under it", async ({ app }) => {
  await app.open();
  await app.page.getByTestId("more-places").click();
  await app.page.getByTestId("pin-kit").click();
  await app.page.keyboard.press("Escape");
  await expect(app.nav("kit")).toHaveCount(0);
  await app.page.getByTestId("more-places").click();
  await app.page.getByTestId("more-kit").click();
  await expect(app.page.getByTestId("kit")).toBeVisible();
  expect(((await app.stored("app.prefs")) as { railPlaces: string[] }).railPlaces).toEqual(["home", "projects"]);
});

test("folded away (⌘\\), the rail alone is left, with search, the bell and a way back", async ({ app }) => {
  await app.open();
  await app.page.keyboard.press(`${mod()}+Backslash`);
  const rail = app.page.getByTestId("sidebar-rail");
  await expect(rail).toBeVisible();
  await expect(app.page.getByTestId("sidebar-sheet")).toHaveCount(0);
  await expect(rail.getByRole("button", { name: "Search" })).toBeVisible();
  await expect(rail.getByTestId("notifications")).toBeVisible();
  await rail.getByRole("button", { name: "Show the sidebar" }).click();
  await expect(app.page.getByTestId("sidebar-sheet")).toBeVisible();
});
