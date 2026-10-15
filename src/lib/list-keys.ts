// Where the keyboard goes in a list of rows (components/data-table.tsx):
// the arrows move one, PageUp and PageDown a screen, Home and End to the
// ends. Pure, so list-keys.test.ts runs it in node. The rows carry one
// tabindex=0 between them (a roving tabindex), so Tab leaves the list in
// one press and the arrows move inside it.

export interface ListMove {
  index: number;
  count: number;
  // Rows that fit on a screen, for PageUp and PageDown.
  page: number;
}

// moveIndex is the row a key goes to, or undefined for a key that isn't a move.
export function moveIndex(key: string, m: ListMove): number | undefined {
  if (m.count === 0) return undefined;
  const last = m.count - 1;
  const clamp = (i: number) => Math.max(0, Math.min(last, i));
  switch (key) {
    case "ArrowDown":
      return clamp(m.index + 1);
    case "ArrowUp":
      return clamp(m.index - 1);
    case "PageDown":
      return clamp(m.index + Math.max(1, m.page));
    case "PageUp":
      return clamp(m.index - Math.max(1, m.page));
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return undefined;
  }
}

export type SortDir = "asc" | "desc";

// toggleSort is what a click on a column's header does: sort by it, then
// the other way, then not at all.
export function toggleSort(current: { by: string; dir: SortDir } | undefined, by: string): { by: string; dir: SortDir } | undefined {
  if (current?.by !== by) return { by, dir: "asc" };
  if (current.dir === "asc") return { by, dir: "desc" };
  return undefined;
}

// parseSort reads "name:desc" from an address; anything else is no sort.
export function parseSort(s: string | undefined, columns: string[]): { by: string; dir: SortDir } | undefined {
  const [by, dir] = (s ?? "").split(":");
  if (!by || !columns.includes(by)) return undefined;
  return { by, dir: dir === "desc" ? "desc" : "asc" };
}

export const sortToString = (s: { by: string; dir: SortDir } | undefined): string | undefined => (s ? `${s.by}:${s.dir}` : undefined);
