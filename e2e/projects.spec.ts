import { expect, test } from "./fixtures";

// The example list view (views/projects): its three states, its filters
// and a detail that writes back to the mock.

test("projects list from the fixtures, narrow by search and tags, and open a detail", async ({ app }) => {
  await app.open();
  await app.nav("projects").click();
  const rows = app.page.getByTestId("project-row");
  await expect(rows).toHaveCount(8);
  await app.page.getByRole("searchbox", { name: "Find a project" }).fill("app");
  await expect(rows).toHaveCount(2);
  await app.page.getByRole("searchbox", { name: "Find a project" }).fill("");
  await app.page.getByRole("button", { name: "mobile", exact: true, pressed: false }).click();
  await expect(rows).toHaveCount(2);
  await app.page.getByRole("button", { name: "mobile", exact: true, pressed: true }).click();
  await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  // A write: paused, kept by the mock, shown on the way back.
  // PickOne is a toggle group: its options are pressed buttons.
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Shop is now paused" })).toBeVisible();
  await detail.getByRole("button", { name: "Back to projects" }).click();
  await expect(app.page.locator("[data-testid=project-row][data-project=p-shop]")).toContainText("paused");
});

test("a slow server shows the loader, a down one the failure with a retry, an empty one the empty state", async ({ app }) => {
  await app.open({ params: { slow: "1" } });
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects-loading")).toBeVisible();
  await expect(app.page.getByTestId("project-row").first()).toBeVisible({ timeout: 15_000 });

  await app.open({ params: { fail: "1" } });
  await app.nav("projects").click();
  const failed = app.page.getByTestId("projects-failed");
  await expect(failed).toBeVisible();
  await expect(failed.getByRole("button", { name: "Try again" })).toBeVisible();

  await app.open({ params: { empty: "1" } });
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects-empty")).toBeVisible();
});
