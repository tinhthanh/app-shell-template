// Dates and numbers, in the person's language (Intl): every view formats
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
export function date(iso: string, locale: string = lang()): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
}

// dateTime adds the time, for a tooltip behind an "ago".
export function dateTime(iso: string, locale: string = lang()): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

// number formats a count with the person's grouping ("1,234" or "1.234").
export function number(n: number, locale: string = lang(), options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(n);
}
