# 0013: The app's words are one table per language, with no library

**Status:** accepted, 2026-10-18

**Context.** Apps built from the template are used by people who don't
read English. Dates and numbers already went through `Intl`
(`lib/format.ts`); the words were English in the code.

**Decision.** `t("area.key", { blanks })` (`lib/i18n.ts`) returns a word
in the language in use. The words live in `lib/messages/<area>.ts`, one
file per area of the app: an `en` table (the source) and one per
language typed as `Record<keyof typeof en, string>`, so a missing word
fails to compile, and `i18n.test.ts` checks that each keeps the English
one's blanks. The Language setting is "Match system" by default (the
first of the browser's languages the app has words for, else English);
`<html lang>` and `lib/format.ts` follow it. A change of language redraws
the frame (`App.tsx` keys it); the view, the session and what was read
are kept. No i18n library: a few dozen lines do what the app needs, run
in node, and add nothing to the startup budget.

**Consequences.** A word read at module load is frozen in the language
the app started in: read it in render (a function, not a constant).
Plurals are written around (`{n} in all`), which suits English and
Vietnamese; a language with plural forms wants `Intl.PluralRules`. The
Kit page and the release notes stay English: the one is for whoever
builds the app, the other is a record. `pnpm check:words` refuses a new
English word written straight into a view or a component.

**Revisit if.** A language needs plural forms or gender (then: ICU
messages through a library), or the words come from a translation
service (then: the tables are generated, the keys stay).
