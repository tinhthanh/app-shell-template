// node --experimental-strip-types --test src/lib/format.test.ts (pnpm test)
import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { ago, date, dateTime, day, fileSize, money, number, today, totalsOf } from "./format.ts";

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

test("a time that isn't one reads as nothing, rather than throwing", () => {
  assert.equal(date("not a date", "en-GB"), "");
  assert.equal(dateTime("2026-13-45", "en-GB"), "");
  assert.equal(ago("nope", "en-GB"), "");
});

test("a due day reads as that day wherever the person is, and one that isn't a day reads as nothing", () => {
  assert.equal(day("2026-11-02", "en-GB"), "2 Nov 2026");
  assert.equal(day("2026-11-02", "vi"), "2 thg 11, 2026");
  assert.equal(day("2026-02-30", "en-GB"), "");
  assert.equal(day("soon", "en-GB"), "");
});

test("today is written as a due day is", () => {
  assert.equal(today(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
});

test("a file's size reads in the language's units", () => {
  assert.equal(fileSize(512, "en"), "512 byte");
  assert.equal(fileSize(182_400, "en"), "182.4 kB");
  assert.equal(fileSize(1_250_000, "vi"), "1,3 MB");
});

test("amounts add up by currency, never across them, the most used currency first", () => {
  const rows = [
    { amount: 100, currency: "USD" },
    { amount: 2_500_000, currency: "VND" },
    { amount: 50.5, currency: "USD" },
  ];
  assert.deepEqual(totalsOf(rows), [
    { currency: "USD", amount: 150.5, count: 2 },
    { currency: "VND", amount: 2_500_000, count: 1 },
  ]);
  assert.deepEqual(totalsOf([]), []);
});
