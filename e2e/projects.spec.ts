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

test("a failed read is explained in words, with the server's own behind Details", async ({ app }) => {
  await app.open({ params: { fail: "1" } });
  await app.nav("projects").click();
  const note = app.page.getByTestId("error-note");
  await expect(note).toContainText("The server is busy");
  await note.getByRole("button", { name: "Details" }).click();
  await expect(app.page.getByLabel("Full output")).toContainText("not answering right now");
});

test("the edit form refuses an empty name, shows the server's refusal on the field, and saves", async ({ app }) => {
  await app.open();
  await app.page.goto("/?mock=1#/projects/p-shop");
  const detail = app.page.getByTestId("project-detail");
  await detail.getByRole("button", { name: "Edit the project" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the project" });
  const name = dialog.getByRole("textbox", { name: "Name" });
  await name.fill("");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("A project needs a name.")).toBeVisible();
  await name.fill("Docs");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("Another project is already called Docs.")).toBeVisible();
  await name.fill("Shop 2");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(detail.getByRole("heading", { name: "Shop 2", exact: true })).toBeVisible();
});
