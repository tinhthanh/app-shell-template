import { create } from "zustand";

// What views and background work put in the status bar: a connection's
// state, a count, a job's progress. Each has an id (setting it again
// replaces it), an order (lower first, along the start of the bar), its
// words, a tone, and where a click goes. useStatusItem (hooks/) puts one up
// while a component is mounted. After Shipyard's status bar
// (github.com/cosscom/shipyard, MIT). Pure, so status-items.test.ts runs it.

export interface StatusItem {
  id: string;
  label: string;
  order?: number;
  tone?: "default" | "warning" | "error" | "success";
  // A longer line for its tooltip and a screen reader.
  tip?: string;
  onClick?: () => void;
}

export const useStatusItems = create<{ items: StatusItem[] }>()(() => ({ items: [] }));

const byOrder = (a: StatusItem, b: StatusItem) => (a.order ?? 50) - (b.order ?? 50) || a.id.localeCompare(b.id);

// putStatusItem shows an item, or replaces the one with its id.
export function putStatusItem(item: StatusItem) {
  useStatusItems.setState((s) => ({ items: [...s.items.filter((i) => i.id !== item.id), item].sort(byOrder) }));
}

export function dropStatusItem(id: string) {
  useStatusItems.setState((s) => ({ items: s.items.filter((i) => i.id !== id) }));
}
