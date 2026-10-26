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

// The statuses, once, for the route, the mock and the view.
export const PROJECT_STATUSES = ["active", "paused", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

// ---- Workspaces (the sidebar's rail) ---------------------------------------
// What the person belongs to (a team, a company): every record is in one,
// and the app shows one at a time (lib/workspace.ts).

export interface Workspace {
  id: string;
  name: string;
  // How many things in it want the person: the rail's dot.
  attention?: number;
}

export interface Project {
  id: string;
  // The workspace it belongs to (Workspace.id).
  workspace: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  tags: string[];
  // ISO 8601.
  updatedAt: string;
}

// What the list asks the server for: the filters and the sort from the
// address (lib/routes.ts), and where to start.
export interface ProjectQuery {
  // The workspace to list, by id; all of them when left out.
  workspace?: string;
  q?: string;
  status?: ProjectStatus;
  tags?: string[];
  // "name:asc", as the address has it (lib/list-keys.ts).
  sort?: string;
  cursor?: string;
  limit?: number;
}

// ---- A list a page at a time (lib/pages.ts) --------------------------------

export interface Page<T> {
  items: T[];
  // Where the next page starts; absent on the last.
  next?: string;
  // How many match in all, for the count and a screen reader.
  total: number;
}

// ---- Who is signed in (lib/session.ts) ------------------------------------

// What a person may do follows their role (lib/permissions.ts).
export const ROLES = ["owner", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// ---- Search (the palette's record search) ---------------------------------

export interface SearchHit {
  kind: "project";
  id: string;
  name: string;
  // A line under the name: the owner, the status.
  detail?: string;
}
