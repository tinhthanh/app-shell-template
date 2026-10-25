// The records opened last (a project, a customer), newest first, for the
// sidebar's Recent: a detail view calls rememberRecent once its record has
// loaded, and the list is kept in prefs (lib/prefs.ts). Pure apart from that,
// so recent.test.ts runs it in node.
import type { SearchHit } from "./types.ts";

export interface RecentItem {
  kind: SearchHit["kind"];
  id: string;
  name: string;
}

export const MAX_RECENT = 5;

export const isRecentItem = (x: unknown): x is RecentItem =>
  typeof x === "object" && x !== null && typeof (x as RecentItem).kind === "string" && typeof (x as RecentItem).id === "string" && typeof (x as RecentItem).name === "string";

// withRecent puts a record first, once, and keeps the newest MAX_RECENT.
export function withRecent(list: RecentItem[], item: RecentItem): RecentItem[] {
  return [item, ...list.filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, MAX_RECENT);
}
