// The app's words in the person's language: t("shell.place.home") is the
// word for the language in use, and t("projects.countAll", { n }) fills in
// what it is given. The words live in lib/messages/, one file per area, English first;
// every other language is typed against English, so a missing word fails
// to compile. The language follows the Language setting (lib/prefs.ts),
// "Match system" by default; dates and numbers follow it (lib/format.ts).
// Pure apart from the one language in use, so i18n.test.ts runs it in node.
import { en, type Key, vi } from "./messages/index.ts";

export type { Key };

export const LANGUAGES = {
  en: { name: "English", words: en },
  vi: { name: "Tiếng Việt", words: vi },
} satisfies Record<string, { name: string; words: Record<Key, string> }>;

export type Language = keyof typeof LANGUAGES;
export const LANGUAGE_IDS = Object.keys(LANGUAGES) as Language[];

// What the Language setting holds: a language, or the system's.
export type LanguageChoice = Language | "system";

let current: Language = "en";

export const language = (): Language => current;

export function setLanguage(l: Language) {
  current = l;
}

// resolveLanguage is the language a choice comes to: the system's is the
// first of its languages the app has words for (vi-VN is vi), else English.
export function resolveLanguage(choice: LanguageChoice, system: readonly string[] = []): Language {
  if (choice !== "system") return choice;
  for (const tag of system) {
    const base = tag.toLowerCase().split("-")[0] as Language;
    if (LANGUAGE_IDS.includes(base)) return base;
  }
  return "en";
}

// A count's words: {n, plural, one {# project} other {# projects}} is the
// form Intl.PluralRules picks for n in the language in use (zero, one, two,
// few, many, other, or an exact =0), # being n as that language writes
// numbers. other is always there; a language with one form (Vietnamese)
// writes {n} and no plural at all. A form may hold blanks of its own
// ({# projects are now {status}}), filled after.
const PLURAL = /\{(\w+), plural,((?:\s*(?:=\d+|zero|one|two|few|many|other)\s*\{(?:[^{}]|\{\w+\})*\})+)\s*\}/g;
const FORM = /(=\d+|zero|one|two|few|many|other)\s*\{((?:[^{}]|\{\w+\})*)\}/g;

// plural picks a count's form: an exact =n first, then the language's category, then other.
function plural(n: number, forms: string): string {
  const all = new Map([...forms.matchAll(FORM)].map((m) => [m[1], m[2] ?? ""]));
  const chosen = all.get(`=${n}`) ?? all.get(new Intl.PluralRules(current).select(n)) ?? all.get("other") ?? "";
  return chosen.replace(/#/g, written(n));
}

// written is a number as the language in use writes it (1,234 or 1.234).
const written = (v: string | number) => (typeof v === "number" ? new Intl.NumberFormat(current).format(v) : v);

// t is the word for key in the language in use, with each {name} in it
// filled from params (a number written as the language writes it) and each
// count given its form; a blank that isn't given stays as it is, so it shows.
export function t(key: Key, params?: Record<string, string | number>): string {
  const s = LANGUAGES[current].words[key] ?? en[key];
  return params ? fill(s, params) : s;
}

// fill is t's work on a word already looked up: its counts given their
// forms, then its blanks filled.
export function fill(s: string, params: Record<string, string | number>): string {
  return s
    .replace(PLURAL, (m, k: string, forms: string) => (typeof params[k] === "number" ? plural(params[k], forms) : m))
    .replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? written(params[k] as string | number) : m));
}
