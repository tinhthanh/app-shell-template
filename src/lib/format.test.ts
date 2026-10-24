// node --experimental-strip-types --test src/lib/format.test.ts (pnpm test)
import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { ago, date, dateTime, money, number } from "./format.ts";

test("ago reads a time in the person's language, at each boundary", () => {
  mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-14T12:00:00Z") });
  const at = (s: number) => new Date(Date.now() - s * 1000).toISOString();
  assert.equal(ago(at(0), "en-GB"), "now");
  assert.equal(ago(at(59), "en-GB"), "now");
  assert.equal(ago(at(60), "en-GB"), "1 minute ago");
  assert.equal(ago(at(3599), "en-GB"), "59 minutes ago");
  assert.equal(ago(at(3600), "en-GB"), "1 hour ago");
  assert.equal(ago(at(86400), "en-GB"), "1 day ago");
  assert.equal(ago(at(86400 * 29), "en-GB"), "29 days ago");
  // Older than a month: the date itself.
  assert.equal(ago(at(86400 * 40), "en-GB"), "4 Sept 2026");
  assert.equal(ago(at(-120), "en-GB"), "now");
  assert.equal(ago(undefined), "");
  assert.equal(ago(at(60), "de-DE"), "vor 1 Minute");
  mock.timers.reset();
});

test("dates and numbers follow the locale", () => {
  assert.equal(date("2026-10-14T12:00:00Z", "en-US"), "Oct 14, 2026");
  assert.equal(date("2026-10-14T12:00:00Z", "de-DE"), "14.10.2026");
  assert.match(dateTime("2026-10-14T12:00:00Z", "en-GB"), /^14 Oct 2026, \d{2}:\d{2}$/);
  assert.equal(number(1234567, "en-US"), "1,234,567");
  assert.equal(number(1234567, "de-DE"), "1.234.567");
});

test("an amount reads as money in the person's language, with the currency's own decimals", () => {
  assert.equal(money(12500, "USD", "en-US"), "$12,500.00");
  assert.equal(money(312500000, "VND", "vi-VN").replace(/\s/g, " "), "312.500.000 ₫");
  assert.match(money(12500, "EUR", "de-DE"), /^12\.500,00\s€$/);
});
