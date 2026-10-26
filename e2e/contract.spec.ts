import { expect, test } from "./fixtures";

// The app on its real HTTP client (src/lib/api.ts httpClient) against the
// contract's stub (scripts/stub-server.mjs, the mock served over HTTP), so
// the paths, the bodies and the refusals the client sends and reads are the
// ones api/openapi.json names. The page asks /api on its own origin, which
// the test hands to the stub: nothing leaves the test. A refusal (a 4xx) is
// the fixture's to refuse, so its shape is proven in scripts/contract.test.mjs.

const stubModule = "../scripts/stub-server.mjs";

test("on its HTTP client, the app lists the stub's projects, and a change goes over HTTP and stays", async ({ app }) => {
  const { startStub } = (await import(stubModule)) as { startStub(port: number): Promise<{ url: string; close(): Promise<void> }> };
  const stub = await startStub(0);
  try {
    await app.page.route("**/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: 'window.__APP_CONFIG__ = { apiUrl: "/api" };' }));
    await app.page.route("**/api/**", async (r) => {
      const url = new URL(r.request().url());
      const res = await r.fetch({ url: `${stub.url}${url.pathname.replace(/^\/api/, "")}${url.search}` });
      await r.fulfill({ response: res });
    });
    // mock=0: the fixture's ?mock=1 would choose the fixtures over config.js.
    await app.open({ params: { mock: "0" }, hash: "/projects" });
    await expect(app.page.getByTestId("project-row")).toHaveCount(8);
    // A status change goes over HTTP and is there after a reload.
    await app.page.locator("[data-testid=project-row][data-project=p-shop]").click();
    const detail = app.page.getByTestId("project-detail");
    await detail.getByRole("button", { name: "Paused", exact: true }).click();
    await expect(app.page.locator("[data-slot=toast-title]", { hasText: "Shop is now paused" })).toBeVisible();
    await app.page.reload();
    await expect(detail.getByRole("button", { name: "Paused", exact: true })).toHaveAttribute("aria-pressed", "true");
  } finally {
    // The page may still be reading (a list read again after the change): it
    // leaves first, so nothing reaches the stub's port once it is closed.
    await app.page.goto("about:blank");
    await stub.close();
  }
});
