import { useEffect, useSyncExternalStore } from "react";

import { usePrefs } from "@/lib/prefs";
import { useStore } from "@/lib/store";
import type { Theme } from "@/lib/types";
import { applyTheme } from "@/themes/apply";
import { builtinThemes, defaultDark } from "@/themes/builtin";

// useThemes lists every theme. Built-in only here; an app that loads more
// (from its API, from the person's files) merges them in by id.
export function useThemes(): Theme[] {
  return builtinThemes;
}

// SYSTEM_THEME follows the computer's light or dark appearance, with a
// theme for each (Settings › Appearance).
export const SYSTEM_THEME = "system";

const darkQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined;

function useSystemDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      darkQuery?.addEventListener("change", onChange);
      return () => darkQuery?.removeEventListener("change", onChange);
    },
    () => darkQuery?.matches ?? true,
  );
}

export function useActiveTheme(): Theme {
  const themes = useThemes();
  const id = useStore((s) => s.themeId);
  const dark = useSystemDark();
  const system = usePrefs((p) => p.systemThemes);
  if (id !== SYSTEM_THEME) return themes.find((t) => t.id === id) ?? defaultDark;
  // A pick that has gone falls back to the app's own.
  const want = dark ? system.dark : system.light;
  return themes.find((t) => t.id === want) ?? themes.find((t) => t.id === (dark ? "default-dark" : "default-light")) ?? defaultDark;
}

// useApplyTheme keeps the document's colors in step with the chosen theme.
export function useApplyTheme() {
  const theme = useActiveTheme();
  useEffect(() => applyTheme(theme), [theme]);
}
