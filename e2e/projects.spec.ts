import { expect, mod, test } from "./fixtures";

// The example list view (views/projects): its three states, its filters
// and a detail that writes back to the mock.

test("the projects list comes from the fixtures and narrows by search and by tag", async ({ app }) => {
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
  await expect(rows).toHaveCount(8);
});

test("a row opens its detail, and a status change there is kept and shown on the way back", async ({ app }) => {
  await app.open({ hash: "/projects" });
  await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  // PickOne is a toggle group: its options are pressed buttons.
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Shop is now paused" })).toBeVisible();
  await detail.getByRole("button", { name: "Back to projects" }).click();
  await expect(app.page.locator("[data-testid=project-row][data-project=p-shop]")).toContainText("paused");
});

test("a search that leaves nothing says so, and clearing it brings the rows back", async ({ app }) => {
  await app.open({ hash: "/projects?q=zzz" });
  await expect(app.page.getByTestId("nothing-matches")).toBeVisible();
  await app.page.getByRole("searchbox", { name: "Find a project" }).fill("");
  await expect(app.page.getByTestId("project-row")).toHaveCount(8);
});

test("another filter shows the loader until its rows come, not the last filter's rows", async ({ app }) => {
  await app.open({ params: { slow: "1" }, hash: "/projects" });
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
  await app.page.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.getByTestId("projects-loading")).toBeVisible();
  await expect(app.page.getByTestId("project-row")).toHaveCount(1);
});

test("a reload that fails keeps the rows under a note that says so, with Try again", async ({ app }) => {
  await app.open({ params: { failAfter: "2" }, hash: "/projects" });
  await expect(app.page.getByTestId("project-row")).toHaveCount(8);
  await app.page.getByRole("button", { name: "Reload" }).click();
  const stale = app.page.getByTestId("projects-stale");
  await expect(stale).toContainText("The server is busy");
  await expect(stale.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(app.page.getByTestId("project-row")).toHaveCount(8);
});

test("a slow server shows the loader until the rows come", async ({ app }) => {
  await app.open({ params: { slow: "1" } });
  await app.nav("projects").click();
  await expect(app.page.getByTestId("projects-loading")).toBeVisible();
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
});

test("a server that is down shows the failure with Try again", async ({ app }) => {
  await app.open({ params: { fail: "1" } });
  await app.nav("projects").click();
  const failed = app.page.getByTestId("projects-failed");
  await expect(failed).toBeVisible();
  await expect(failed.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("an empty server shows the empty state", async ({ app }) => {
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
  await app.open({ hash: "/projects/p-shop" });
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
  await app.open({ params: { failWrites: "1" }, hash: "/projects/p-shop" });
  const detail = app.page.getByTestId("project-detail");
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Couldn't update the project" })).toBeVisible();
  await expect(app.page.locator("[data-slot=toast-description]")).toContainText("The server is busy");
  await expect(detail.getByText("Active", { exact: true })).toBeVisible();
});

test("a project that doesn't exist says so, with no Try again, and a way back", async ({ app }) => {
  await app.open({ hash: "/projects/nope" });
  const missing = app.page.getByTestId("project-missing");
  await expect(missing.getByRole("heading", { name: "Nothing here" })).toBeVisible();
  await expect(missing.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await app.page.getByRole("button", { name: "Back to projects" }).click();
  await expect(app.page.getByTestId("projects")).toBeVisible();
});

test("a project in a workspace you aren't in says it isn't yours to see", async ({ app }) => {
  await app.open({ hash: "/projects/p-vault" });
  await expect(app.page.getByTestId("project-forbidden").getByRole("heading", { name: "Not yours to see" })).toBeVisible();
});

test("switching projects quickly shows the last one asked for, never an earlier answer", async ({ app }) => {
  await app.open({ params: { slow: "1" }, hash: "/projects/p-shop" });
  // Before Shop arrives, ask for the API instead: a new address in the same page.
  await app.page.evaluate(() => {
    location.hash = "#/projects/p-api";
  });
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Public API", exact: true })).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toHaveCount(0);
});

test("after a dialog closes the keyboard is somewhere, never on the page's body", async ({ app }) => {
  await app.open({ hash: "/projects/p-shop" });
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
  await app.open({ hash: "/projects?tags=mobile" });
  await expect(rows).toHaveCount(2);
});

test("coming back to the list draws it at once from what was kept, and reads again behind", async ({ app }) => {
  await app.open({ params: { slow: "1" } });
  await app.nav("projects").click();
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
  await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await app.page.getByRole("button", { name: "Back to projects" }).click();
  // Rows at once (the mock takes 1.5 s to answer again), and no loader.
  await expect(app.page.getByTestId("project-row")).toHaveCount(8, { timeout: 500 });
  expect(await app.page.getByTestId("projects-loading").count()).toBe(0);
});

test("a status change shows at once, before the server has answered, in the record and the sheet", async ({ app }) => {
  // ?hold=1: the write never answers, so what shows can only be the app's own.
  await app.open({ params: { hold: "1" }, hash: "/projects/p-shop" });
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Paused", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(app.page.getByTestId("projects-column").getByRole("region", { name: "Paused" }).locator("[data-project=p-shop]")).toBeVisible();
  await expect(app.page.locator("[data-slot=toast-title]")).toHaveCount(0);
});

test("a status change the server refuses goes back, with a toast", async ({ app }) => {
  await app.open({ params: { failWrites: "1" }, hash: "/projects/p-shop" });
  const detail = app.page.getByTestId("project-detail");
  await expect(detail.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Paused", exact: true }).click();
  // The server refuses: back to Active, with the toast.
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Couldn't update the project" })).toBeVisible();
  await expect(detail.getByText("Active", { exact: true }).first()).toBeVisible();
});

test("a project renamed on its page is renamed in the sheet beside it, without leaving", async ({ app }) => {
  await app.open({ hash: "/projects/p-shop" });
  const row = app.page.locator("[data-testid=column-project][data-project=p-shop]");
  await expect(row).toContainText("Shop");
  await app.page.getByTestId("project-detail").getByRole("button", { name: "Edit the project" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Storefront");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText("Storefront");
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

test("a place's shortcut does nothing while a form is open, so what is typed stays", async ({ app }) => {
  await app.open({ hash: "/projects/p-shop" });
  await app.page.getByRole("button", { name: "Edit the project" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Shop 7");
  await app.page.keyboard.press(`${mod()}+1`);
  await app.page.keyboard.press(`${mod()}+Comma`);
  await expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue("Shop 7");
  await expect(app.page).toHaveURL(/#\/projects\/p-shop$/);
});

test("closing the edit dialog with unsaved changes asks first", async ({ app }) => {
  await app.open({ hash: "/projects/p-shop" });
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

test("a header sorts the list up, down, then not at all, and the sort is in the address", async ({ app }) => {
  await app.open();
  await app.nav("projects").click();
  const table = app.page.getByRole("table", { name: "Projects" });
  const first = () => table.getByTestId("project-row").first().getAttribute("data-project");
  await table.getByRole("button", { name: "Name" }).click();
  await expect(app.page).toHaveURL(/sort=name:asc$/);
  await expect(table.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
  await expect.poll(first).toBe("p-android");
  await table.getByRole("button", { name: "Name" }).click();
  await expect.poll(first).toBe("p-warehouse");
  await table.getByRole("button", { name: "Name" }).click();
  await expect(app.page).not.toHaveURL(/sort=/);
  await expect.poll(first).toBe("p-shop");
});

test("the arrows move between rows, End reaches the last row read and the next page follows, and Enter opens one", async ({ app }) => {
  await app.open({ params: { many: "1" } });
  await app.nav("projects").click();
  const rows = app.page.getByTestId("project-row");
  await expect(rows.first()).toBeVisible();
  await expect(app.page.getByText("5,000 projects")).toBeVisible();
  // A screen reader hears the whole count; only what fits is in the DOM.
  await expect(app.page.getByRole("table", { name: "Projects" })).toHaveAttribute("aria-rowcount", "5000");
  expect(await rows.count()).toBeLessThan(120);
  await rows.first().focus();
  await app.page.keyboard.press("ArrowDown");
  await app.page.keyboard.press("ArrowDown");
  await expect(app.page.locator("[data-testid=project-row][data-project=p-3]")).toBeFocused();
  await app.page.keyboard.press("End");
  await expect(app.page.locator("[data-testid=project-row][data-project=p-50]")).toBeFocused();
  // The end of the first page is on screen: the second comes after it.
  await expect(app.page.locator("[data-testid=project-row][data-project=p-51]")).toBeAttached();
  await app.page.keyboard.press("End");
  await expect(app.page.locator("[data-testid=project-row][data-project=p-100]")).toBeFocused();
  await app.page.keyboard.press("PageUp");
  await expect(app.page.locator("[data-testid=project-row]:focus")).toHaveCount(1);
  await app.page.keyboard.press("Home");
  await expect(app.page.locator("[data-testid=project-row][data-project=p-1]")).toBeFocused();
  await app.page.keyboard.press("Enter");
  await expect(app.page.getByTestId("project-detail").getByRole("heading", { name: "Shop 1", exact: true })).toBeVisible();
});

test("back from a row on a later page, the list still has it and the keyboard lands on it", async ({ app }) => {
  await app.open({ params: { many: "1" }, hash: "/projects" });
  const rows = app.page.getByTestId("project-row");
  await rows.first().focus();
  await app.page.keyboard.press("End");
  await expect(app.page.locator("[data-testid=project-row][data-project=p-51]")).toBeAttached();
  await app.page.keyboard.press("End");
  const row = app.page.locator("[data-testid=project-row][data-project=p-100]");
  await expect(row).toBeFocused();
  await app.page.keyboard.press("Enter");
  await app.page.getByTestId("project-detail").getByRole("button", { name: "Back to projects" }).click();
  await expect(row).toBeFocused();
});

test("a page that doesn't come says so at the end of the list, and Try again brings it", async ({ app }) => {
  await app.open({ params: { many: "1", failMore: "1" }, hash: "/projects" });
  await app.page.getByTestId("project-row").first().focus();
  await app.page.keyboard.press("End");
  const more = app.page.getByTestId("more-rows");
  await expect(more).toContainText("Couldn't read more");
  await more.getByRole("button", { name: "Try again" }).click();
  await expect(app.page.locator("[data-testid=project-row][data-project=p-51]")).toBeAttached();
});

test("a filter is asked of the server, and the count says how many match", async ({ app }) => {
  await app.open({ params: { many: "1" }, hash: "/projects?q=harbour" });
  await expect(app.page.getByText("500 projects match")).toBeVisible();
  await expect(app.page.getByRole("table", { name: "Projects" })).toHaveAttribute("aria-rowcount", "500");
});

test("scrolled far from the row the keyboard was on, Tab still lands in the table", async ({ app }) => {
  await app.open({ params: { many: "1" }, hash: "/projects" });
  const rows = app.page.getByTestId("project-row");
  await rows.first().focus();
  await app.page.locator("[data-slot=data-table]").evaluate((el) => {
    el.scrollTop = 1500;
  });
  // The first row has left the DOM; a row on screen holds the Tab stop instead.
  await expect(app.page.locator("[data-testid=project-row][data-project=p-1]")).toHaveCount(0);
  await expect(app.page.locator('[data-testid=project-row][tabindex="0"]')).toHaveCount(1);
});

test("on a phone the table leaves out the Updated column, so a row fits the width", async ({ app }) => {
  await app.page.setViewportSize({ width: 375, height: 740 });
  await app.open({ hash: "/projects" });
  await expect(app.page.getByTestId("project-row").first()).toBeVisible();
  await expect(app.page.getByRole("columnheader", { name: "Updated" })).toBeHidden();
  await expect
    .poll(() =>
      app.page.evaluate(() => {
        const t = document.querySelector("[data-slot=data-table]");
        return t ? t.scrollWidth <= t.clientWidth : false;
      }),
    )
    .toBe(true);
});
