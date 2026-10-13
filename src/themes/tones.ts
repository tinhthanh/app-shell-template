import type { Theme } from "@/lib/types";
import { contrast, distance, fromOklch, over } from "./color.ts";

// Tones: six colours for tags, groups and avatars, each a hue and chroma
// that a theme shows at the lightness nearest its own where it reads as
// text on the theme's page and sidebar, on its own wash (a tag's 15%
// tint), and keeps clear of the state colours, so a tag is never read as
// a warning or a success. Light themes darken, dark ones lighten. No
// imports but types and colour maths: pnpm check:themes runs this in node.

export const TONES = ["violet", "cyan", "magenta", "slate", "pink", "copper"] as const;
export type Tone = (typeof TONES)[number];

export const isTone = (t: unknown): t is Tone => typeof t === "string" && (TONES as readonly string[]).includes(t);

// toneVar is the CSS variable a tone is drawn with (index.css, applied by
// themes/apply.ts).
export const toneVar = (t: Tone) => `var(--tone-${t})`;

// Each tone as OKLCH (lightness, chroma, hue), for light and dark themes.
// index.css holds the same as a fallback.
export const TONE_LCH: Record<Tone, { light: [number, number, number]; dark: [number, number, number] }> = {
  violet: { light: [0.53, 0.2, 293], dark: [0.74, 0.14, 293] },
  cyan: { light: [0.55, 0.11, 212], dark: [0.77, 0.1, 212] },
  magenta: { light: [0.53, 0.22, 328], dark: [0.73, 0.17, 328] },
  slate: { light: [0.5, 0.02, 265], dark: [0.74, 0.025, 260] },
  pink: { light: [0.6, 0.18, 2], dark: [0.8, 0.11, 2] },
  copper: { light: [0.55, 0.11, 50], dark: [0.76, 0.09, 55] },
};

// hashTone picks a tone for a key, the same every time.
export function hashTone(key: string): Tone {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return TONES[h % TONES.length];
}

export const TONE_TEXT = 4.5;
// The washes tones sit on: a tag's 15%.
const WASH = 0.15;

// toneChecks is each surface a tone's text must read on, and how well it does.
export function toneChecks(tone: string, t: Theme): { what: string; value: number }[] {
  const c = t.colors;
  return [
    { what: "on the background", value: contrast(tone, c.background) },
    { what: "on the sidebar", value: contrast(tone, c.sidebar) },
    { what: "on its wash over the sidebar", value: contrast(tone, over(tone, c.sidebar, WASH)) },
    { what: "on its wash over the background", value: contrast(tone, over(tone, c.background, WASH)) },
  ];
}

const reads = (tone: string, t: Theme) => toneChecks(tone, t).every((x) => x.value >= TONE_TEXT);

// How far, in OKLab, a tone keeps from the theme's state colours.
export const TONE_APART = 0.07;

export const stateColours = (t: Theme): string[] => [t.colors.success, t.colors.warning, t.colors.destructive, t.colors.info].filter((x): x is string => !!x);

const apart = (tone: string, t: Theme) => stateColours(t).every((s) => distance(tone, s) >= TONE_APART);

export function toneFor(tone: Tone, t: Theme): string {
  const dark = t.appearance === "dark";
  const [L, C, H] = TONE_LCH[tone][dark ? "dark" : "light"];
  // The nearest lightness that reads and keeps clear of the states; then,
  // turning the hue a little either way; else the nearest that reads.
  let first: string | undefined;
  for (const turn of [0, 12, -12, 24, -24]) {
    for (let step = 0; step <= 60; step++) {
      const l = dark ? Math.min(0.97, L + step * 0.005) : Math.max(0.2, L - step * 0.005);
      const x = fromOklch(l, C, (H + turn + 360) % 360);
      if (!reads(x, t)) continue;
      first ??= x;
      if (apart(x, t)) return x;
    }
  }
  return first ?? fromOklch(L, C, H);
}

// toneColors is every tone on a theme, as --tone-<tone> wants it.
export function toneColors(t: Theme): Record<Tone, string> {
  return Object.fromEntries(TONES.map((x) => [x, toneFor(x, t)])) as Record<Tone, string>;
}
