import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";

import { moveIndex, type SortDir, toggleSort } from "@/lib/list-keys";
import { cn } from "@/lib/utils";

// DataTable is the list every resource's rows go in: columns with a header
// that sorts (aria-sort, up, down, then off), rows that open with a click
// or Enter, the arrows, PageUp/Down, Home and End moving between them (one
// Tab stop for the whole list), and only the rows on screen in the DOM,
// however many there are (@tanstack/react-virtual). Rows take their height
// from density (h-row). The sort is the caller's: keep it in the view, so
// the address carries it (lib/list-keys.ts has the pure parts).
//
//   <DataTable rows={projects} rowKey={(p) => p.id} columns={[{ id: "name", label: "Name", sort: byName, cell: (p) => … }]}
//     sort={sort} onSort={setSort} onOpen={open} label="Projects" rowProps={(p) => ({ "data-project": p.id })} />

export interface Column<T> {
  id: string;
  label: ReactNode;
  // Present: the header sorts by it.
  sort?: (a: T, b: T) => number;
  // Numbers and dates sit at the end.
  align?: "start" | "end";
  // A width for the column, else it shares what is left.
  className?: string;
  // Shown from this breakpoint up; narrower windows leave it out.
  from?: "md" | "lg";
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
  className,
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
  className?: string;
}) {
  const sorted = (() => {
    const col = sort && columns.find((c) => c.id === sort.by);
    if (!col?.sort) return rows;
    const s = [...rows].sort(col.sort);
    return sort?.dir === "desc" ? s.reverse() : s;
  })();
  const scroller = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({ count: sorted.length, getScrollElement: () => scroller.current, estimateSize: () => 44, overscan: 12 });
  // The one row Tab lands on: the last one the keyboard was on, else the first.
  const [current, setCurrent] = useState(0);
  const [wanted, setWanted] = useState<number>();
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
  const onKey = (e: KeyboardEvent, index: number, row: T) => {
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
  const top = items[0]?.start ?? 0;
  const bottom = virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);
  const visible = (c: Column<T>) => (c.from === "md" ? "max-md:hidden" : c.from === "lg" ? "max-lg:hidden" : "");
  return (
    <div ref={scroller} className={cn("h-full overflow-auto", className)} data-slot="data-table">
      <table className="w-full border-separate border-spacing-0 text-sm" aria-label={label} aria-rowcount={sorted.length}>
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            {columns.map((c) => {
              const active = sort?.by === c.id;
              const ariaSort = active ? (sort.dir === "asc" ? "ascending" : "descending") : c.sort ? "none" : undefined;
              return (
                <th
                  key={c.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn("border-b px-3 py-1.5 text-start font-medium text-muted-foreground text-xs", c.align === "end" && "text-end", visible(c), c.className)}
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
              <td style={{ height: top }} colSpan={columns.length} />
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
                tabIndex={item.index === current ? 0 : -1}
                aria-rowindex={item.index + 1}
                onFocus={() => setCurrent(item.index)}
                onKeyDown={(e) => onKey(e, item.index, row)}
                onClick={() => onOpen?.(row)}
                className={cn("h-row outline-none", onOpen && "cursor-default hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset")}
              >
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
              <td style={{ height: bottom }} colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
