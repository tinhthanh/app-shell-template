// node --experimental-strip-types --test src/lib/explain.test.ts (pnpm test)
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "./errors.ts";
import { explain, looksRaw } from "./explain.ts";

test("a code or status becomes words, with the raw text behind details", () => {
  const e = explain(new ApiError("upstream connect error", 503, "unavailable"));
  assert.equal(e.title, "The server is busy");
  assert.equal(e.retry, true);
  assert.equal(e.details, "upstream connect error");
  assert.equal(explain(new ApiError("", 401)).title, "You're signed out");
  assert.equal(explain(new ApiError("nope", 404, "not_found")).title, "It's gone");
});

test("a sentence the server wrote for people is kept, made a sentence", () => {
  const e = explain(new ApiError("name is already taken", 422));
  assert.equal(e.message, "Name is already taken.");
  assert.equal(e.details, "name is already taken");
});

test("text written for a program is never the message", () => {
  assert.ok(looksRaw("TypeError: Failed to fetch"));
  const e = explain(new TypeError("Failed to fetch"));
  assert.equal(e.title, "Can't reach the server");
  assert.equal(explain("ECONNREFUSED 127.0.0.1:8080").message, "The app couldn't finish that.");
});
