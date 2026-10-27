// Dates, due days, numbers, money and file sizes, in the person's language (Intl): every view formats
// through here, never by hand. locale defaults to the app's language
// (lib/i18n.ts), in the browser's region when that is the same language
// (en-GB, not en); the tests pin one. Pure, so format.test.ts runs it in node.
import { language } from "./i18n.ts";

export function lang(): string {
  const ui = language();
  const browser = typeof navigator === "undefined" ? undefined : navigator.language;
  return browser && browser.toLowerCase().split("-")[0] === ui ? browser : ui;
}

// ago says how long ago an ISO time was, in a word or two: "just now",
// "12 minutes ago", "3 days ago"; a time in the future reads "just now".
export function ago(iso?: string, locale: string = lang()): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "always" });
  if (s < 3600) return rtf.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.floor(s / 3600), "hour");
  if (s < 86400 * 30) return rtf.format(-Math.floor(s / 86400), "day");
  return date(iso, locale);
}

// date is an ISO time as a date, the way the person writes them.
// A time that isn't one (a server's typo) reads as nothing, rather than
// taking the view down with Intl's RangeError.
export function date(iso: string, locale: string = lang()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
}

// dateTime adds the time, for a tooltip behind an "ago".
export function dateTime(iso: string, locale: string = lang()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

// number formats a count with the person's grouping ("1,234" or "1.234").
export function number(n: number, locale: string = lang(), options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(n);
}

// money formats an amount in a currency (ISO 4217: "USD", "EUR", "VND") the
// way the person writes money: "$12,500.00", "12.500 €", "312.500.000 ₫",
// with the currency's own decimals (none for the dong). Convert before, and
// say so where it shows: a converted amount is an estimate.
export function money(amount: number, currency: string, locale: string = lang()): string {
  return number(amount, locale, { style: "currency", currency });
}

// day is a due day ("2026-11-02") the way the person writes dates. It is a
// day, not a time: read where they are, never moved by a time zone (new
// Date("2026-11-02") would be midnight in London, the day before in Hanoi's
// west). One that isn't a day reads as nothing.
export function day(s: string, locale: string = lang()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getMonth() !== Number(m[2]) - 1) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(d);
}

// today is the day it is where the person is, as a due day is written.
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// fileSize is a file's size in the language's units: "182 kB", "1.2 MB".
export function fileSize(bytes: number, locale: string = lang()): string {
  const [n, unit] = bytes < 1000 ? [bytes, "byte"] : bytes < 1_000_000 ? [bytes / 1000, "kilobyte"] : [bytes / 1_000_000, "megabyte"];
  return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: 1 }).format(n);
}
