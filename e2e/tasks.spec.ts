import { expect, mod, test } from "./fixtures";

// Tasks, the second resource (views/tasks/): the list and its states, a
// record, and a form with every kind of field (a day, a project picked as
// you type, a file).

const row = (app: { page: import("@playwright/test").Page }, id: string) => app.page.locator(`[data-testid=task-row][data-task=${id}]`);

test("the workspace's tasks list with their project and day, and a late one says so", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await expect(app.page.getByTestId("task-row")).toHaveCount(6);
  await expect(row(app, "t-checkout")).toContainText("Shop");
  await expect(row(app, "t-webhooks")).toHaveAttribute("data-late", "true");
  await expect(row(app, "t-webhooks")).toContainText("Late");
  await expect(row(app, "t-checkout")).not.toHaveAttribute("data-late");
});

test("a slow server shows the loader until the tasks come", async ({ app }) => {
  await app.open({ params: { slow: "1" }, hash: "/tasks" });
  await expect(app.page.getByTestId("tasks-loading")).toBeVisible();
  await expect(app.page.getByTestId("task-row").first()).toBeVisible();
});

test("a server that is down says so, with Try again", async ({ app }) => {
  await app.open({ params: { fail: "1" }, hash: "/tasks" });
  await expect(app.page.getByTestId("tasks-failed").getByRole("button", { name: "Try again" })).toBeVisible();
});

test("a workspace with no tasks shows the empty state", async ({ app }) => {
  await app.open({ params: { empty: "1" }, hash: "/tasks" });
  await expect(app.page.getByTestId("tasks-empty")).toBeVisible();
});

test("another workspace on the rail lists its own tasks", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await expect(app.page.getByTestId("task-row")).toHaveCount(6);
  await app.page.locator("[data-testid=rail-workspace][data-workspace=w-globex]").click();
  await expect(app.page.getByTestId("task-row")).toHaveCount(2);
  await expect(row(app, "t-invoices")).toBeVisible();
});

test("a task opened from a link in another workspace brings its workspace with it", async ({ app }) => {
  await app.open({ hash: "/tasks/t-invoices" });
  await expect(app.page.getByTestId("task-detail").getByRole("heading", { name: "Send the October invoices", exact: true })).toBeVisible();
  await expect(app.page.getByTestId("workspace-header")).toContainText("Globex");
});

test("a task is made with every kind of field: a title, a project found as you type, a day and a file", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await app.page.getByRole("button", { name: "New task" }).first().click();
  const dialog = app.page.getByRole("dialog", { name: "New task" });
  await dialog.getByRole("textbox", { name: "Title" }).fill("Write the launch notes");
  await dialog.getByTestId("picker-project").fill("ware");
  await app.page.getByRole("option", { name: "Warehouse" }).click();
  await dialog.getByLabel("Due").fill("2026-12-01");
  await dialog.getByLabel("File").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("The notes.") });
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog).toHaveCount(0);
  const detail = app.page.getByTestId("task-detail");
  await expect(detail.getByRole("heading", { name: "Write the launch notes", exact: true })).toBeVisible();
  await expect(detail).toContainText("Warehouse");
  await expect(app.page.getByTestId("task-due")).toContainText("2026");
  await expect(app.page.getByTestId("task-file")).toContainText("notes.txt");
});

test("the form refuses no title, and a file too big before it is sent", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await app.page.getByRole("button", { name: "New task" }).first().click();
  const dialog = app.page.getByRole("dialog", { name: "New task" });
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByText("A task needs a title.")).toBeVisible();
  await dialog.getByRole("textbox", { name: "Title" }).fill("Big file");
  await dialog.getByLabel("File").setInputFiles({ name: "huge.bin", mimeType: "application/octet-stream", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(dialog.getByText("Files up to 5 MB, please.")).toBeVisible();
});

test("an edit takes the file off and the project with it", async ({ app }) => {
  await app.open({ hash: "/tasks/t-webhooks" });
  await app.page.getByRole("button", { name: "Edit the task" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the task" });
  await dialog.getByRole("button", { name: "Remove retry-policy.pdf" }).click();
  await dialog.getByTestId("picker-project").clear();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(app.page.getByTestId("task-file")).toContainText("No file");
  await expect(app.page.getByTestId("task-detail")).toContainText("No project");
});

test("a status change shows at once, before the server answers", async ({ app }) => {
  await app.open({ params: { hold: "1" }, hash: "/tasks/t-icons" });
  const detail = app.page.getByTestId("task-detail");
  await detail.getByRole("button", { name: "Done", exact: true }).click();
  await expect(detail.getByRole("button", { name: "Done", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("a task is deleted after a confirm, and Back from a task lands on its row", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await row(app, "t-icons").click();
  await app.page.getByTestId("task-detail").getByRole("button", { name: "Back" }).first().click();
  await expect(row(app, "t-icons")).toBeFocused();
  await row(app, "t-labels").click();
  await app.page.getByTestId("task-detail").getByRole("button", { name: "Delete" }).click();
  await app.page.getByTestId("confirm").getByRole("button", { name: "Delete" }).click();
  await expect(app.page.getByTestId("tasks")).toBeVisible();
  await expect(row(app, "t-labels")).toHaveCount(0);
});

test("a project's page leads to its tasks, and the filter comes off with its ✕", async ({ app }) => {
  await app.open({ hash: "/projects/p-api" });
  await app.page.getByTestId("project-tasks").click();
  await expect(app.page).toHaveURL(/#\/tasks\?project=p-api$/);
  await expect(app.page.getByTestId("task-row")).toHaveCount(1);
  await app.page.getByRole("button", { name: "Clear the choice" }).click();
  await expect(app.page.getByTestId("task-row")).toHaveCount(6);
  await expect(app.page).toHaveURL(/#\/tasks$/);
});

test("the toolbar narrows the tasks to a project found as you type, and the address keeps it", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await app.page.getByTestId("tasks-project-filter").fill("ios");
  await app.page.getByRole("option", { name: "iOS app" }).click();
  await expect(app.page.getByTestId("task-row")).toHaveCount(1);
  await expect(app.page).toHaveURL(/project=p-ios/);
  await app.page.reload();
  await expect(row(app, "t-icons")).toBeVisible();
  await expect(app.page.getByTestId("task-row")).toHaveCount(1);
});

test("with Hide done tasks on, the list opens without them and the address says so", async ({ app }) => {
  await app.open({ prefs: { hideDoneTasks: true }, hash: "/tasks" });
  await expect(app.page).toHaveURL(/#\/tasks\?done=hide$/);
  await expect(app.page.getByTestId("task-row")).toHaveCount(5);
  await expect(row(app, "t-labels")).toHaveCount(0);
});

test("a link that says to show done tasks shows them, whatever the setting", async ({ app }) => {
  await app.open({ prefs: { hideDoneTasks: true }, hash: "/tasks?done=show" });
  await expect(app.page.getByTestId("task-row")).toHaveCount(6);
  await expect(app.page).toHaveURL(/done=show/);
});

test("closing the task form with edits asks first", async ({ app }) => {
  await app.open({ hash: "/tasks/t-icons" });
  await app.page.getByRole("button", { name: "Edit the task" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the task" });
  await dialog.getByRole("textbox", { name: "Title" }).fill("Newer app icons");
  await app.page.keyboard.press("Escape");
  await expect(app.page.getByTestId("confirm")).toContainText("Discard your changes?");
});

test("a save the server refuses keeps the form open, with a toast", async ({ app }) => {
  await app.open({ params: { failWrites: "1" }, hash: "/tasks/t-icons" });
  await app.page.getByRole("button", { name: "Edit the task" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the task" });
  await dialog.getByRole("textbox", { name: "Title" }).fill("Newer app icons");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Couldn't save the task" })).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("a viewer sees the tasks but no way to make, change or delete one", async ({ app }) => {
  await app.open({ params: { role: "viewer" }, hash: "/tasks/t-icons" });
  const detail = app.page.getByTestId("task-detail");
  await expect(detail.getByRole("heading", { name: "New app icons", exact: true })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Edit the task" })).toHaveCount(0);
  await expect(detail.getByRole("button", { name: "Delete" })).toHaveCount(0);
  await app.open({ params: { role: "viewer" }, hash: "/tasks" });
  await expect(app.page.getByTestId("task-row").first()).toBeVisible();
  await expect(app.page.getByRole("button", { name: "New task" })).toHaveCount(0);
});

test("⌘K finds a task and opens it", async ({ app }) => {
  await app.open();
  await app.page.keyboard.press(`${mod()}+k`);
  const palette = app.page.getByTestId("command-palette");
  await palette.getByRole("combobox").fill("webhook retr");
  await palette.getByRole("option", { name: /Document the webhook retries/ }).click();
  await expect(app.page.getByTestId("task-detail").getByRole("heading", { name: "Document the webhook retries", exact: true })).toBeVisible();
});

test("a task form opened and closed untouched closes without asking", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await app.page.getByRole("button", { name: "New task" }).first().click();
  const dialog = app.page.getByRole("dialog", { name: "New task" });
  await expect(dialog).toBeVisible();
  await app.page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(app.page.getByTestId("confirm")).toHaveCount(0);
});

test("a file picked in a form that was then discarded isn't sent with the next one", async ({ app }) => {
  await app.open({ hash: "/tasks" });
  await app.page.getByRole("button", { name: "New task" }).first().click();
  const dialog = app.page.getByRole("dialog", { name: "New task" });
  await dialog.getByLabel("File").setInputFiles({ name: "old.txt", mimeType: "text/plain", buffer: Buffer.from("old") });
  await app.page.keyboard.press("Escape");
  await app.page.getByTestId("confirm").getByRole("button", { name: "Discard" }).click();
  await expect(dialog).toHaveCount(0);
  await app.page.getByRole("button", { name: "New task" }).first().click();
  await dialog.getByRole("textbox", { name: "Title" }).fill("No file here");
  await dialog.getByRole("button", { name: "Create" }).click();
  await expect(app.page.getByTestId("task-file")).toContainText("No file");
});

test("the project filter names the project, from a project's page too", async ({ app }) => {
  await app.open({ hash: "/projects/p-api" });
  await app.page.getByTestId("project-tasks").click();
  await expect(app.page.getByTestId("tasks-project-filter")).toHaveValue("Public API");
});

test("another workspace picked on a task's page goes to that workspace's tasks", async ({ app }) => {
  await app.open({ hash: "/tasks/t-icons" });
  await expect(app.page.getByTestId("task-detail")).toBeVisible();
  await app.page.locator("[data-testid=rail-workspace][data-workspace=w-globex]").click();
  await expect(app.page.getByTestId("task-detail")).toHaveCount(0);
  await expect(app.page.getByTestId("task-row")).toHaveCount(2);
});

test("the project filter keeps its name while a search finds no task", async ({ app }) => {
  await app.open({ hash: "/tasks?project=p-api" });
  const filter = app.page.getByTestId("tasks-project-filter");
  await expect(filter).toHaveValue("Public API");
  await app.page.getByRole("searchbox", { name: "Find a task" }).fill("zzz");
  await expect(app.page.getByTestId("nothing-matches")).toBeVisible();
  await expect(filter).toHaveValue("Public API");
});

test("taking a task's file off and then closing asks first", async ({ app }) => {
  await app.open({ hash: "/tasks/t-webhooks" });
  await app.page.getByRole("button", { name: "Edit the task" }).click();
  const dialog = app.page.getByRole("dialog", { name: "Edit the task" });
  await dialog.getByRole("button", { name: "Remove retry-policy.pdf" }).click();
  await app.page.keyboard.press("Escape");
  await expect(app.page.getByTestId("confirm")).toContainText("Discard your changes?");
});

test("a reload with edits in a form asks first", async ({ app }) => {
  await app.open({ hash: "/tasks/t-icons" });
  await app.page.getByRole("button", { name: "Edit the task" }).click();
  await app.page.getByRole("dialog", { name: "Edit the task" }).getByRole("textbox", { name: "Title" }).fill("Newer app icons");
  const asked = new Promise<string>((done) => app.page.once("dialog", (d) => void d.accept().then(() => done(d.type()))));
  await app.page.reload();
  expect(await asked).toBe("beforeunload");
});

test("a reload with a form open and nothing changed doesn't ask", async ({ app }) => {
  await app.open({ hash: "/tasks/t-icons" });
  await app.page.getByRole("button", { name: "Edit the task" }).click();
  await expect(app.page.getByRole("dialog", { name: "Edit the task" })).toBeVisible();
  let asked = false;
  app.page.once("dialog", (d) => {
    asked = true;
    void d.accept();
  });
  await app.page.reload();
  await expect(app.page.getByTestId("task-detail")).toBeVisible();
  expect(asked).toBe(false);
});
