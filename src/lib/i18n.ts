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

// t is the word for key in the language in use, with each {name} in it
// filled from params; one that isn't given stays as it is, so it shows.
export function t(key: Key, params?: Record<string, string | number>): string {
  const s = LANGUAGES[current].words[key] ?? en[key];
  return params ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : s;
}
