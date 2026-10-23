// One ink for the sidebar, its rail and Settings' nav: text and icons are
// one grey family at a few strengths, so the column reads as one quiet
// list and the row you are on stands out. The strengths run from the
// theme's foreground down to its muted text, which every theme keeps
// readable as small text (4.5:1, pnpm check:themes), so the faintest text
// reads in all of them; a foreground at low opacity doesn't, in half the
// built-in themes. Only icons go fainter than that. inkScale sets the
// steps on a column's root; ink names them. After Shipyard's
// (github.com/cosscom/shipyard, MIT).
export const inkScale = [
  "[--ink-row:color-mix(in_oklab,var(--foreground)_40%,var(--muted-foreground))]",
  "[--ink-quiet:color-mix(in_oklab,var(--foreground)_10%,var(--muted-foreground))]",
  "[--ink-faint:var(--muted-foreground)]",
  "[--ink-glyph:color-mix(in_oklab,var(--muted-foreground)_75%,transparent)]",
].join(" ");

export const ink = {
  // The row you are on.
  strong: "text-foreground",
  // An ordinary row: a place, an account.
  row: "text-(color:--ink-row)",
  // A row that is resting: a way back, a control beside the list.
  quiet: "text-(color:--ink-quiet)",
  // Labels, key caps and small notes.
  faint: "text-(color:--ink-faint)",
  // Icons beside text.
  glyph: "text-(color:--ink-glyph)",
};
