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
A count takes its form from `Intl.PluralRules` (2026-10-26):
`{n, plural, one {# project} other {# projects}}` in the word, `#` the
number as the language writes it; Vietnamese, with one form, writes `{n}`.
A number given to any blank is written the language's way (`5,000`,
`5.000`). `i18n.test.ts` checks every count has `other` and only forms its
language has. The
Kit page and the release notes stay English: the one is for whoever
builds the app, the other is a record. `pnpm check:words` refuses a new
English word written straight into a view or a component.

**Vietnamese words.** One way of writing each, so the app reads as one
voice (`i18n.test.ts` holds the tone marks to it):

| Say | Not | |
|---|---|---|
| xóa, hủy, tùy chọn, hòa, khỏe | xoá, huỷ, tuỳ | the older tone placement, as most Vietnamese software writes it |
| Đang đọc… | Đang tải… | a read in progress |
| {name} hiện đang tạm dừng | {name} giờ đang… | a status toast: plain, not chatty |
| dự án, cài đặt, chủ đề, phím tắt, giao diện | | the places and settings |
| Free, Team, Enterprise; a product's or a plan's name | Miễn phí, Nhóm, Doanh nghiệp | names stay as the product spells them |
| đã ngừng sử dụng | đã rời đi | a customer who left |
| {name} hiện đang tạm dừng / đang làm / đã lên kế hoạch | {name} đã được … | a status toast for a state ("now paused", "under way", "planned"): hiện đang … for what lasts |
| {name} đã xong / đã phát hành; Đã lưu trữ {name} | {name} hiện đang xong; {name} đã được lưu trữ | a status toast for a state that is reached ("done", "shipped"): đã …, or the action first when the record can't be its subject ("Đã lưu trữ 3 dự án") |
| one sentence per status in a bulk toast | {n} dự án hiện đang {status} | a state word dropped into a sentence doubles words ("đang đang hoạt động") |
| công việc, bản phát hành, phiên bản, ngày phát hành, tệp | nhiệm vụ, release, version, file | tasks, releases, a version, a ship date, a file |
| hạn, trễ hạn | deadline, quá hạn | a due day, and one that has passed |

A count is `{n, plural, …}` in English and plain `{n} …` in Vietnamese,
which has one form (`Đã chọn {n}`, `{n} dự án`).

**Revisit if.** A language needs plural forms or gender (then: ICU
messages through a library), or the words come from a translation
service (then: the tables are generated, the keys stay).
