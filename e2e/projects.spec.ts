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

test("Try again reads again after a server that was down comes back", async ({ app }) => {
  await app.open({ params: { failOnce: "1" } });
  await app.nav("projects").click();
  await app.page.getByTestId("error-note").getByRole("button", { name: "Try again" }).click();
  await expect(app.page.getByTestId("project-row")).toHaveCount(8);
});

test("a failed save is a toast in plain words, and the project is left as it was", async ({ app }) => {
  await app.open({ params: { failWrites: "1" } });
  await app.page.goto("/?mock=1&platform=linux&failWrites=1#/projects/p-shop");
  const detail = app.page.getByTestId("project-detail");
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Couldn't update the project" })).toBeVisible();
  await expect(app.page.locator("[data-slot=toast-description]")).toContainText("The server is busy");
  await expect(detail.getByText("Active", { exact: true })).toBeVisible();
});

test("a project that doesn't exist says so, with a way back", async ({ app }) => {
  await app.open();
  await app.page.goto("/?mock=1&platform=linux#/projects/nope");
  const note = app.page.getByTestId("error-note");
  await expect(note).toContainText("It's gone");
  await app.page.getByRole("button", { name: "Back to projects" }).click();
  await expect(app.page.getByTestId("projects")).toBeVisible();
});

test("switching projects quickly shows the last one asked for, never an earlier answer", async ({ app }) => {
  await app.open({ params: { slow: "1" } });
  await app.page.goto("/?mock=1&platform=linux&slow=1#/projects/p-shop");
  // Before Shop arrives, ask for the API instead.
  await app.page.goto("/?mock=1&platform=linux&slow=1#/projects/p-api");
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Public API", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toHaveCount(0);
});

test("after a dialog closes the keyboard is somewhere, never on the page's body", async ({ app }) => {
  await app.open();
  await app.page.goto("/?mock=1&platform=linux#/projects/p-shop");
  await app.page.getByRole("button", { name: "Edit the project" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Shop 3");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => app.page.evaluate(() => document.activeElement !== document.body && document.activeElement !== null)).toBe(true);
});

test("the list's filters live in the URL: reload, Back and a link keep them", async ({ app }) => {
  await app.open();
  await app.nav("projects").click();
  await app.page.getByRole("searchbox", { name: "Find a project" }).fill("app");
  await app.page.getByRole("button", { name: "Active", exact: true }).click();
  await expect(app.page).toHaveURL(/#\/projects\?q=app&status=active$/);
  const rows = app.page.getByTestId("project-row");
  await expect(rows).toHaveCount(1);
  await app.page.reload();
  await expect(rows).toHaveCount(1);
  await expect(app.page.getByRole("searchbox", { name: "Find a project" })).toHaveValue("app");
  // Into a project and back: the filters are still there, and the row has the keyboard.
  await rows.first().click();
  await expect(app.page).toHaveURL(/#\/projects\/p-ios\?q=app&status=active$/);
  await app.page.getByRole("button", { name: "Back to projects" }).click();
  await expect(rows).toHaveCount(1);
  await expect(app.page.locator("[data-testid=project-row][data-project=p-ios]")).toBeFocused();
  // A shared link opens narrowed.
  await app.page.goto("/?mock=1&platform=linux#/projects?tags=mobile");
  await expect(rows).toHaveCount(2);
});

test("coming back to the list draws it at once from what was kept, and reads again behind", async ({ app }) => {
  await app.open({ params: { slow: "1" } });
  await app.nav("projects").click();
  await expect(app.page.getByTestId("project-row").first()).toBeVisible({ timeout: 15_000 });
  await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible({ timeout: 15_000 });
  await app.page.getByRole("button", { name: "Back to projects" }).click();
  // Rows at once (the mock takes 1.5 s to answer again), and no loader.
  await expect(app.page.getByTestId("project-row")).toHaveCount(8, { timeout: 500 });
  expect(await app.page.getByTestId("projects-loading").count()).toBe(0);
});

test("a status change shows at once, and goes back with a toast when the server refuses", async ({ app }) => {
  await app.open();
  await app.page.goto("/?mock=1&platform=linux&failWrites=1&slow=1#/projects/p-shop");
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toBeVisible({ timeout: 15_000 });
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  // Before the server answers: already paused on screen.
  await expect(detail.getByText("Paused", { exact: true }).first()).toBeVisible({ timeout: 500 });
  // The server refuses: back to Active, with the toast.
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Couldn't update the project" })).toBeVisible({ timeout: 15_000 });
  await expect(detail.getByText("Active", { exact: true }).first()).toBeVisible();
});

test("the first project is created from the empty state, and a project is deleted after a confirm", async ({ app }) => {
  await app.open({ params: { empty: "1" } });
  await app.nav("projects").click();
  await app.page.getByTestId("projects-empty").getByRole("button", { name: "New project" }).click();
  const dialog = app.page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Loyalty cards");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0);
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Loyalty cards", exact: true })).toBeVisible();
  await expect(app.page).toHaveURL(/#\/projects\/p-loyalty-cards$/);
  await detail.getByRole("button", { name: "Delete" }).click();
  const confirm = app.page.getByTestId("confirm");
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(app.page.getByTestId("projects-empty")).toBeVisible();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "was deleted" })).toBeVisible();
});

test("closing the edit dialog with unsaved changes asks first", async ({ app }) => {
  await app.open();
  await app.page.goto("/?mock=1&platform=linux#/projects/p-shop");
  await app.page.getByRole("button", { name: "Edit the project" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Shop 9");
  await app.page.keyboard.press("Escape");
  const confirm = app.page.getByTestId("confirm");
  await expect(confirm).toContainText("Discard your changes?");
  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("Shop 9");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await app.page.getByTestId("confirm").getByRole("button", { name: "Discard" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
});
