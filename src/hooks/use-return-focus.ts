import { useEffect } from "react";

// Coming back to a list from one of its rows, the keyboard lands on that
// row: the detail says which with returnFocusTo before it leaves, and the
// list calls useReturnFocus with the attribute its rows carry
// (data-project). The effect runs after every render, as the rows come a
// render after the data, and lets go once the row has the focus. It
// returns the row's id, for <DataTable focusRow> to scroll a row that is
// far down a long list back into the DOM.

let pending: { attr: string; id: string } | undefined;

export function returnFocusTo(attr: string, id: string) {
  pending = { attr, id };
}

export function useReturnFocus(attr: string): string | undefined {
  useEffect(() => {
    if (pending?.attr !== attr) return;
    const row = document.querySelector<HTMLElement>(`[${attr}="${CSS.escape(pending.id)}"]`);
    if (!row) return;
    row.focus();
    pending = undefined;
  });
  return pending?.attr === attr ? pending.id : undefined;
}
