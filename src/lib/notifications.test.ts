// node --experimental-strip-types --test src/lib/notifications.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { clearNotices, MAX_NOTICES, markAllRead, notify, unreadCount, useNotifications } from "./notifications.ts";

test("a notice comes first, unread, with its time and a way back", () => {
  clearNotices();
  notify({ title: "Shop is now paused", tone: "success", action: { label: "Open", view: { kind: "projects", id: "p-shop" } } });
  notify({ title: "Export done" });
  const [newest, older] = useNotifications.getState().notices;
  assert.equal(newest?.title, "Export done");
  assert.equal(newest?.tone, "info");
  assert.equal(older?.action?.view.kind, "projects");
  assert.ok(!Number.isNaN(Date.parse(older?.at ?? "")));
  assert.equal(unreadCount(useNotifications.getState().notices), 2);
});

test("opening the centre reads them all, and clearing empties it", () => {
  clearNotices();
  notify({ title: "One" });
  markAllRead();
  assert.equal(unreadCount(useNotifications.getState().notices), 0);
  clearNotices();
  assert.equal(useNotifications.getState().notices.length, 0);
});

test("only the newest notices are kept", () => {
  clearNotices();
  for (let i = 0; i < MAX_NOTICES + 5; i++) notify({ title: `n${i}` });
  const kept = useNotifications.getState().notices;
  assert.equal(kept.length, MAX_NOTICES);
  assert.equal(kept[0]?.title, `n${MAX_NOTICES + 4}`);
});
