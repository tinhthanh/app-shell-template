import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// The app in two tabs behaves as one (lib/tabs.ts), and a session the server
// ends warns before it does (hooks/use-session-end.ts). Each tab runs its
// own fixtures, as two tabs on one server's cookie would.

async function secondTab(page: Page): Promise<Page> {
  const other = await page.context().newPage();
  await other.goto(page.url());
  await expect(other.getByTestId("nav-home")).toBeVisible();
  return other;
}

async function signOut(page: Page) {
  await page.getByTestId("account").click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByTestId("signin")).toBeVisible();
}

test("signing out in one tab signs out the other", async ({ app }) => {
  await app.open();
  const other = await secondTab(app.page);
  await signOut(app.page);
  await expect(other.getByTestId("signin")).toBeVisible();
});

test("signing in again in one tab brings back the other that was on the sign-in page", async ({ app }) => {
  await app.open();
  const other = await secondTab(app.page);
  await signOut(app.page);
  await expect(other.getByTestId("signin")).toBeVisible();
  const signin = app.page.getByTestId("signin");
  await signin.getByRole("textbox", { name: "Email" }).fill("alex@acme.test");
  await signin.getByLabel("Password").fill("hunter2");
  await signin.getByRole("button", { name: "Sign in" }).click();
  await expect(other.getByTestId("signin")).toHaveCount(0);
  await expect(other.getByTestId("nav-home")).toBeVisible();
});

test("a setting changed in one tab is the setting in the other", async ({ app }) => {
  await app.open();
  const other = await secondTab(app.page);
  await expect(other.locator("html")).toHaveAttribute("data-density", "compact");
  const appearance = await app.openSettings("appearance");
  await appearance.getByRole("button", { name: "Comfortable", exact: true }).click();
  await expect(other.locator("html")).toHaveAttribute("data-density", "comfortable");
});

test("a session the server ends is warned two minutes before, and Stay signed in keeps the person in", async ({ app }) => {
  await app.page.clock.install();
  await app.open({ params: { sessionMinutes: "3" } });
  // Signed in (the workspace shows once me() answered), then the time passes.
  await expect(app.page.getByTestId("workspace-header")).toBeVisible();
  await app.page.clock.fastForward("01:01");
  const warning = app.page.locator("[data-slot=toast-title]", { hasText: "Your session ends soon" });
  await expect(warning).toBeVisible();
  await app.page.getByRole("button", { name: "Stay signed in" }).click();
  await expect(warning).toHaveCount(0);
  // Past where it would have ended: still in.
  await app.page.clock.fastForward("02:30");
  await expect(app.page.getByTestId("signin")).toHaveCount(0);
  await expect(app.nav("home")).toBeVisible();
});

test("a session left to end signs the person out, and says why", async ({ app }) => {
  await app.page.clock.install();
  await app.open({ params: { sessionMinutes: "3" } });
  // Signed in (the workspace shows once me() answered), then the time passes.
  await expect(app.page.getByTestId("workspace-header")).toBeVisible();
  await app.page.clock.fastForward("03:01");
  await expect(app.page.getByTestId("signin")).toBeVisible();
  await expect(app.page.getByTestId("signin-ended")).toContainText("Your session ended");
});
