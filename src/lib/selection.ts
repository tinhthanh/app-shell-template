// Which rows of a list are picked, for an action on them all (a status, a
// delete): DataTable draws the boxes and the keys, the view keeps the set
// (it goes when the filters change) and does the action. Pure, so
// selection.test.ts runs it in node.

export type Selection = ReadonlySet<string>;

// toggled picks a row, or unpicks it.
export function toggled(sel: Selection, id: string): Set<string> {
  const next = new Set(sel);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// ranged picks every row from the anchor (the last one picked on its own) to
// this one, in the order shown, as a Shift+click does: added to what was
// picked, the way the anchor is (picked or not) going for them all.
export function ranged(sel: Selection, ids: readonly string[], anchor: string | undefined, to: string): Set<string> {
  const a = anchor === undefined ? -1 : ids.indexOf(anchor);
  const b = ids.indexOf(to);
  if (a < 0 || b < 0) return toggled(sel, to);
  const pick = anchor !== undefined && sel.has(anchor);
  const next = new Set(sel);
  for (const id of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) {
    if (pick) next.add(id);
    else next.delete(id);
  }
  return next;
}

// header is the box over the column: all the rows shown picked, some, or none.
export function header(sel: Selection, ids: readonly string[]): "all" | "some" | "none" {
  const n = ids.filter((id) => sel.has(id)).length;
  return n === 0 ? "none" : n === ids.length ? "all" : "some";
}

// all picks every row shown, or none when they all were (the header box).
export const flipAll = (sel: Selection, ids: readonly string[]): Set<string> => (header(sel, ids) === "all" ? new Set() : new Set(ids));

// kept is what is still picked of the rows still listed (a row deleted, or
// one the next read no longer has, goes).
export function kept(sel: Selection, ids: readonly string[]): Selection {
  const listed = new Set(ids);
  const next = [...sel].filter((id) => listed.has(id));
  return next.length === sel.size ? sel : new Set(next);
}
