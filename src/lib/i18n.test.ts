// node --experimental-strip-types --test src/lib/i18n.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { fill, LANGUAGES, language, resolveLanguage, setLanguage, t } from "./i18n.ts";
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

test("a count takes the form its number wants, written as the language writes numbers", () => {
  assert.equal(t("projects.countAll", { n: 1 }), "1 project");
  assert.equal(t("projects.countAll", { n: 5000 }), "5,000 projects");
  assert.equal(t("projects.countMatch", { n: 1 }), "1 project matches");
  assert.equal(t("projects.countMatch", { n: 0 }), "0 projects match");
  setLanguage("vi");
  assert.equal(t("projects.countAll", { n: 5000 }), "5.000 dự án");
  setLanguage("en");
  // A form may hold a blank of its own.
  assert.equal(fill("{n, plural, one {# project is now {status}} other {# projects are now {status}}}", { n: 3, status: "paused" }), "3 projects are now paused");
  assert.equal(fill("{n, plural, one {# project is now {status}} other {# projects are now {status}}}", { n: 1, status: "paused" }), "1 project is now paused");
  // A count not given stays to be seen, as a blank does.
  assert.equal(t("projects.countAll", {}), en["projects.countAll"]);
});

test("every count in every language has its other form, and only forms the language has", () => {
  for (const [id, l] of Object.entries(LANGUAGES)) {
    const known = new Set([...new Intl.PluralRules(id).resolvedOptions().pluralCategories, "other"]);
    for (const [k, w] of Object.entries(l.words))
      for (const m of w.matchAll(/\{\w+, plural,(.*)\}/g)) {
        // A form's own blanks ({status}) aren't forms.
        const forms = [...(m[1] ?? "").replace(/\{\w+\}/g, "").matchAll(/(=\d+|\w+)\s*\{/g)].map((f) => f[1] ?? "");
        assert.ok(forms.includes("other"), `${id} ${k}: no other`);
        for (const f of forms) assert.ok(f.startsWith("=") || known.has(f as Intl.LDMLPluralRule), `${id} ${k}: ${f} isn't a form ${id} has`);
      }
  }
});

test("a word in another language keeps every blank the English one has", () => {
  // A count's name is a blank too, whether or not the language gives it forms.
  // Each once: English may name one in every form, a language with one form once.
  const blanks = (s: string) => [...new Set([...s.matchAll(/\{(\w+)(?:\}|, plural,)/g)].map((m) => m[1]))].sort();
  for (const [id, l] of Object.entries(LANGUAGES)) for (const k of Object.keys(en) as (keyof typeof en)[]) assert.deepEqual(blanks(l.words[k]), blanks(en[k]), `${id} ${k}`);
});

test("Vietnamese words put the tone mark one way: hòa, khỏe, thủy, not hoà, khoẻ, thuỷ", () => {
  // The older placement, the one most Vietnamese software uses; quý is the same in both.
  const newer = /o[áàảãạéèẻẽẹ](?=$|[^a-zà-ỹ])|(?<!q)u[ýỳỷỹỵ](?=$|[^a-zà-ỹ])/i;
  for (const [k, w] of Object.entries(LANGUAGES.vi.words)) assert.doesNotMatch(w, newer, k);
});

test("a bulk status reads as a sentence in each language, never a state word dropped into another sentence", () => {
  assert.equal(t("projects.bulk.nowArchived", { n: 3 }), "3 projects are now archived");
  setLanguage("vi");
  assert.equal(t("projects.bulk.nowArchived", { n: 3 }), "Đã lưu trữ 3 dự án");
  assert.equal(t("projects.bulk.nowActive", { n: 2 }), "2 dự án hiện đang hoạt động");
  // No "đang đang" or "đang đã" in any word.
  for (const w of Object.values(LANGUAGES.vi.words)) assert.doesNotMatch(w, /đang (đang|đã)/, w);
  setLanguage("en");
});
