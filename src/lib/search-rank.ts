// How a search ranks what it finds: a name that starts with the words first,
// then one with a word that starts with them, then one that has them
// anywhere, then a match in the description; ties by name. Pure, so
// search-rank.test.ts runs it in node, and the mock's search uses it.

export interface Searchable {
  name: string;
  text?: string;
}

export function score(item: Searchable, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const name = item.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.split(/[\s\-_/]+/).some((w) => w.startsWith(q))) return 60;
  if (name.includes(q)) return 40;
  if (item.text?.toLowerCase().includes(q)) return 20;
  return 0;
}

// rank is the items that match, best first, at most limit.
export function rank<T extends Searchable>(items: T[], query: string, limit = 8): T[] {
  return items
    .map((item) => ({ item, s: score(item, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((x) => x.item);
}
