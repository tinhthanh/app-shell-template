// The app's shared types: what the API answers with (lib/api.ts) and what
// a theme is (src/themes). Keep this file free of imports so node can run
// the theme contrast check without a bundler.

export interface ThemeColors {
  background: string;
  foreground: string;
  sidebar: string;
  sidebarForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  accent: string;
  accentForeground: string;
  primary: string;
  primaryForeground: string;
  card: string;
  popover: string;
  ring: string;
  success: string;
  warning: string;
  destructive: string;
  // Optional: the stylesheet's own show through when a theme leaves them out.
  info?: string;
  successForeground?: string;
  warningForeground?: string;
  destructiveForeground?: string;
  infoForeground?: string;
  link?: string;
  selection?: string;
}

// The ANSI 16 and a few more, as a terminal (or a code block) would draw
// them. Kept so themes ported from editors carry their whole palette.
export interface TerminalColors {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  selectionForeground?: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface Theme {
  id: string;
  name: string;
  appearance: "dark" | "light";
  colors: ThemeColors;
  terminal: TerminalColors;
  // The Shiki theme that colours code, by its name in shiki.style/themes,
  // for an app that highlights code.
  syntax?: string;
}

// ---- The example resource ----------------------------------------------
// Replace Project with what your API serves; lib/api.ts and lib/mock.ts
// follow it.

export type ProjectStatus = "active" | "paused" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  tags: string[];
  // ISO 8601.
  updatedAt: string;
}

// ---- Who is signed in (lib/session.ts) ------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
}
