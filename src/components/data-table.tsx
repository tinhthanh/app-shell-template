import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, ArrowUpIcon, Loader2Icon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { t } from "@/lib/i18n";
import { moveIndex, type SortDir, toggleSort } from "@/lib/list-keys";
import type { More } from "@/lib/resource";
import { flipAll, header, ranged, type Selection, toggled } from "@/lib/selection";
import { cn } from "@/lib/utils";

// DataTable is the list every resource's rows go in: columns with a header
// that sorts (aria-sort, up, down, then off), rows that open with a click,
// Enter or (without selection) Space, the arrows, PageUp/Down, Home and End moving between them (one
// Tab stop for the whole list), and only the rows on screen in the DOM,
// however many there are (@tanstack/react-virtual). Rows take their height
// from density (h-row). The sort is the caller's: keep it in the view, so
// the address carries it (lib/list-keys.ts has the pure parts).
//
// A list read a page at a time (usePages, lib/resource.ts) passes more and
// total: the next page is asked for as the last rows come on screen, a row
// at the end says it is coming or failed (with Try again), and a screen
// reader hears the whole count. Its columns sort with "server": the rows
// come in order.
//
//   <DataTable rows={projects} rowKey={(p) => p.id} columns={[{ id: "name", label: "Name", sort: byName, cell: (p) => … }]}
//     sort={sort} onSort={setSort} onOpen={open} label="Projects" rowProps={(p) => ({ "data-project": p.id })} />
//
// With selection, a box starts each row and one heads the column (every row
// shown, some, none): Space picks the row the keyboard is on (Enter still
// opens it), Shift with a click or Space picks the range from the last one
// picked, ⌘A picks every row shown, Esc lets go of them all (lib/selection.ts).
// The set is the caller's, and the caller acts on it (components/bulk-bar.tsx).

export interface Column<T> {
  id: string;
  label: ReactNode;
  // Present: the header sorts by it, here, or "server" when the rows come sorted.
  sort?: ((a: T, b: T) => number) | "server";
  // Numbers and dates sit at the end.
  align?: "start" | "end";
  // A width for the column, else it shares what is left.
  className?: string;
  // Shown from this breakpoint up; narrower windows leave it out.
  from?: "sm" | "md" | "lg";
  cell: (row: T) => ReactNode;
}

export interface Sort {
  by: string;
  dir: SortDir;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  sort,
  onSort,
  onOpen,
  label,
  rowTestId,
  rowProps,
  total,
  more,
  focusRow,
  className,
  selection,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  sort?: Sort;
  onSort?: (sort: Sort | undefined) => void;
  onOpen?: (row: T) => void;
  // The table's name for a screen reader.
  label: string;
  rowTestId?: string;
  rowProps?: (row: T) => Record<string, string | undefined>;
  // A list read a page at a time: how many in all, and the next page.
  total?: number;
  more?: More;
  // The row (its rowKey) the keyboard comes back to, from useReturnFocus:
  // scrolled into the DOM, however far down, and given the focus.
  focusRow?: string;
  className?: string;
  // The rows picked, and how to say a row's name ("Select Shop").
  selection?: { selected: Selection; onChange(next: Set<string>): void; rowName(row: T): string };
}) {
  const sorted = (() => {
    const col = sort && columns.find((c) => c.id === sort.by);
    if (!col?.sort || col.sort === "server") return rows;
    const s = [...rows].sort(col.sort);
    return sort?.dir === "desc" ? s.reverse() : s;
  })();
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({ count: sorted.length, getScrollElement: () => scroller.current, estimateSize: () => 44, overscan: 12 });
  // The one row Tab lands on: the last one the keyboard was on, else the first.
  const [current, setCurrent] = useState(0);
  const [wanted, setWanted] = useState<number>();
  const sought = useRef<string>(undefined);
  useEffect(() => {
    if (!focusRow || sought.current === focusRow) return;
    const i = sorted.findIndex((r) => rowKey(r) === focusRow);
    if (i < 0) return;
    sought.current = focusRow;
    setCurrent(i);
    setWanted(i);
  });
  // A move to a row off screen: scroll it in, then give it the keyboard.
  useEffect(() => {
    if (wanted === undefined) return;
    virtualizer.scrollToIndex(wanted, { align: "auto" });
    const el = scroller.current?.querySelector<HTMLElement>(`[data-index="${wanted}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      setWanted(undefined);
    }
  });
  // The row a range starts from: the last one picked on its own.
  const anchor = useRef<string>(undefined);
  const ids = selection ? sorted.map(rowKey) : [];
  const pick = (row: T, range: boolean) => {
    if (!selection) return;
    const id = rowKey(row);
    selection.onChange(range ? ranged(selection.selected, ids, anchor.current, id) : toggled(selection.selected, id));
    if (!range) anchor.current = id;
  };
  const onKey = (e: KeyboardEvent, index: number, row: T) => {
    if (selection) {
      if (e.key === " ") {
        e.preventDefault();
        pick(row, e.shiftKey);
        return;
      }
      if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        selection.onChange(new Set(ids));
        return;
      }
      if (e.key === "Escape" && selection.selected.size) {
        e.preventDefault();
        e.stopPropagation();
        selection.onChange(new Set());
        return;
      }
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen?.(row);
      return;
    }
    const page = Math.max(1, Math.floor((scroller.current?.clientHeight ?? 0) / 44) - 1);
    const to = moveIndex(e.key, { index, count: sorted.length, page });
    if (to === undefined || to === index) return;
    e.preventDefault();
    setCurrent(to);
    setWanted(to);
  };
  const items = virtualizer.getVirtualItems();
  // The one Tab stop is always a row that is drawn: the last one the
  // keyboard was on while it is, else the first on screen (after a filter
  // left fewer rows, or a scroll took that one out of the DOM).
  const tabStop = items.some((i) => i.index === current) ? current : (items[0]?.index ?? 0);
  // The last rows are on screen (or the keyboard went to End): ask for the
  // next page. A failed one waits for Try again.
  const last = items.at(-1)?.index ?? -1;
  useEffect(() => {
    if (more?.has && !more.loading && !more.failed && last >= sorted.length - 12) more.load();
  });
  const top = items[0]?.start ?? 0;
  const bottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);
  const visible = (c: Column<T>) => (c.from === "sm" ? "max-sm:hidden" : c.from === "md" ? "max-md:hidden" : c.from === "lg" ? "max-lg:hidden" : "");
  return (
    <div ref={scroller} className={cn("h-full overflow-auto", className)} data-slot="data-table">
      <table className="w-full border-separate border-spacing-0 text-body" aria-label={label} aria-rowcount={total ?? sorted.length}>
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            {selection && (
              <th scope="col" className="w-10 border-b ps-3 pe-0 py-1.5 text-start">
                <Checkbox
                  aria-label={t("common.select.all")}
                  data-testid="select-all"
                  checked={header(selection.selected, ids) === "all"}
                  indeterminate={header(selection.selected, ids) === "some"}
                  onCheckedChange={() => selection.onChange(flipAll(selection.selected, ids))}
                />
              </th>
            )}
            {columns.map((c) => {
              const active = sort?.by === c.id;
              const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : c.sort ? "none" : undefined;
              return (
                <th
                  key={c.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn("border-b px-3 py-1.5 text-start text-label text-muted-foreground", c.align === "end" && "text-end", visible(c), c.className)}
                >
                  {c.sort && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(toggleSort(sort, c.id))}
                      className={cn("inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", active && "text-foreground")}
                    >
                      {c.label}
                      {active && (sort.dir === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {top > 0 && (
            <tr aria-hidden>
              <td style={{ height: top }} colSpan={columns.length + (selection ? 1 : 0)} />
            </tr>
          )}
          {items.map((item) => {
            const row = sorted[item.index] as T;
            return (
              <tr
                key={rowKey(row)}
                ref={virtualizer.measureElement}
                data-index={item.index}
                data-testid={rowTestId}
                {...rowProps?.(row)}
                tabIndex={item.index === tabStop ? 0 : -1}
                aria-rowindex={item.index + 1}
                onFocus={() => setCurrent(item.index)}
                onKeyDown={(e) => onKey(e, item.index, row)}
                onClick={() => onOpen?.(row)}
                data-selected={selection?.selected.has(rowKey(row)) || undefined}
                className={cn(
                  "h-row outline-none data-selected:bg-accent/40",
                  onOpen && "cursor-default hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                )}
              >
                {selection && (
                  // The box picks; the row around it still opens. Its own Tab stop is the row's (Space).
                  // biome-ignore lint/a11y/useKeyWithClickEvents: the row's Space is the keyboard's way to pick; this only keeps a click on the box from opening the row.
                  <td className="w-10 border-b ps-3 pe-0 align-middle" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      tabIndex={-1}
                      aria-label={t("common.select.row", { name: selection.rowName(row) })}
                      data-testid="select-row"
                      checked={selection.selected.has(rowKey(row))}
                      onCheckedChange={(_, d) => pick(row, (d.event as MouseEvent | undefined)?.shiftKey === true)}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.id} className={cn("border-b px-3 py-row-pad align-middle", c.align === "end" && "text-end", visible(c), c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
          {bottom > 0 && (
            <tr aria-hidden>
              <td style={{ height: bottom }} colSpan={columns.length + (selection ? 1 : 0)} />
            </tr>
          )}
        </tbody>
      </table>
      {more?.has && (
        <div className="flex h-row items-center justify-center gap-2 text-muted-foreground text-meta" data-testid="more-rows">
          {more.failed ? (
            <>
              {t("common.table.moreFailed")}
              <Button size="xs" variant="outline" onClick={more.load}>
                {t("common.tryAgain")}
              </Button>
            </>
          ) : (
            <>
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
              <span role="status">{t("common.table.readingMore")}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
