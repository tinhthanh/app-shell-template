// Feature flags: a feature that ships off (or on) until a deployment says
// otherwise. FLAGS is the one table, each with its default and what it is;
// config.js's flags turn one on or off for a deployment (lib/config.ts),
// and ?flags=a,-b does so for a page while the URL knobs are on (a dev or
// demo build). Read once at load: a flag doesn't change under a person.
// Pure, so flags.test.ts runs it in node.
import type { RuntimeConfig } from "./config.ts";

export const FLAGS = {
  // Home's getting-started list (components/getting-started.tsx).
  gettingStarted: { on: true },
} satisfies Record<string, { on: boolean }>;

export type FlagId = keyof typeof FLAGS;

// flagsFrom works out every flag: the default, then config.js, then the URL
// when knobs are on. A name not in FLAGS is ignored, so a typo can't turn on
// something that isn't there.
export function flagsFrom(config: RuntimeConfig, search: string, knobs: boolean): Record<FlagId, boolean> {
  const out = Object.fromEntries(Object.entries(FLAGS).map(([id, f]) => [id, f.on])) as Record<FlagId, boolean>;
  const known = (id: string): id is FlagId => id in FLAGS;
  for (const [id, on] of Object.entries(config.flags ?? {})) if (known(id) && typeof on === "boolean") out[id] = on;
  if (knobs)
    for (const raw of (new URLSearchParams(search).get("flags") ?? "").split(",")) {
      const id = raw.trim().replace(/^-/, "");
      if (known(id)) out[id] = !raw.trim().startsWith("-");
    }
  return out;
}

let flags: Record<FlagId, boolean> | undefined;

// setFlags is called once at start (main.tsx), with flagsFrom's answer.
export function setFlags(f: Record<FlagId, boolean>) {
  flags = f;
}

// flag says whether a feature is on; before setFlags, its default.
export const flag = (id: FlagId): boolean => flags?.[id] ?? FLAGS[id].on;
