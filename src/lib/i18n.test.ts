// node --experimental-strip-types --test src/lib/i18n.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { LANGUAGES, language, resolveLanguage, setLanguage, t } from "./i18n.ts";
import { en } from "./messages/index.ts";

test("a word comes in the language in use, and English is the start", () => {
  assert.equal(language(), "en");
  assert.equal(t("shell.language"), "Language");
  setLanguage("vi");
  assert.equal(t("shell.language"), "Ngôn ngữ");
  setLanguage("en");
});

test("the system's language is the first one the app has words for, else English", () => {
  assert.equal(resolveLanguage("system", ["vi-VN", "en-US"]), "vi");
  assert.equal(resolveLanguage("system", ["fr-FR", "EN-gb"]), "en");
  assert.equal(resolveLanguage("system", ["fr-FR"]), "en");
  assert.equal(resolveLanguage("system"), "en");
  assert.equal(resolveLanguage("vi", ["en-US"]), "vi");
});

test("what a word is given fills its blanks, and a blank not given stays to be seen", () => {
  assert.equal(t("shell.zoom.fromDefault", { sign: "+", n: 2 }), "+2 from default");
  assert.equal(t("shell.zoom.fromDefault", { n: 2 }), "{sign}2 from default");
  assert.equal(t("shell.language", {}), en["shell.language"]);
});

test("every language has a word for every key, and none is left empty", () => {
  for (const [id, l] of Object.entries(LANGUAGES)) {
    assert.deepEqual(Object.keys(l.words).sort(), Object.keys(en).sort(), id);
    for (const [k, w] of Object.entries(l.words)) assert.ok(w.trim(), `${id} ${k}`);
  }
});

test("a word in another language keeps every blank the English one has", () => {
  const blanks = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
  for (const [id, l] of Object.entries(LANGUAGES)) for (const k of Object.keys(en) as (keyof typeof en)[]) assert.deepEqual(blanks(l.words[k]), blanks(en[k]), `${id} ${k}`);
});
