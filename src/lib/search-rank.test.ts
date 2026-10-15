// node --experimental-strip-types --test src/lib/search-rank.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { rank, rankEach, score } from "./search-rank.ts";

test("a name that starts with the words beats a word that does, which beats anywhere, which beats the text", () => {
  const items = [
    { name: "Warehouse", text: "Stock and shipping." },
    { name: "Public API", text: "REST for partners." },
    { name: "Shop", text: "The storefront, with a warehouse feed." },
    { name: "Hardware", text: "" },
  ];
  assert.deepEqual(
    rank(items, "ware").map((i) => i.name),
    ["Warehouse", "Hardware", "Shop"],
  );
  assert.deepEqual(
    rank(items, "api").map((i) => i.name),
    ["Public API"],
  );
  assert.equal(score({ name: "Shop" }, "shop"), 100);
  assert.equal(score({ name: "Shop" }, ""), 0);
  assert.deepEqual(rank(items, "zzz"), []);
  assert.equal(rank(items, "a", 2).length, 2);
});

test("rankEach keeps some of every kind: eight matching projects leave room for the people", () => {
  const projects = Array.from({ length: 8 }, (_, i) => ({ name: `Alpha ${i}`, text: "" }));
  const people = [{ name: "Alpha Jones", text: "" }];
  const hits = rankEach([projects, people], "alpha");
  assert.equal(hits.length, 6);
  assert.ok(hits.some((h) => h.name === "Alpha Jones"));
});
