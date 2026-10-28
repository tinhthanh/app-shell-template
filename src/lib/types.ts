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

// What making a project sends, and what changing one may.
export interface ProjectInput {
  name: string;
  description: string;
  workspace?: string;
}

export interface ProjectPatch {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  tags?: string[];
}

// ---- The second resource: tasks ---------------------------------------------
// A task is a workspace's too, and shows the fields beyond words: a due day,
// a record it points at (its project) and a file (views/tasks/).

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// A file the server keeps (POST /files), named by its id on a record.
export interface Attachment {
  id: string;
  name: string;
  // Bytes.
  size: number;
  // Its MIME type: "application/pdf".
  type: string;
}

export interface Task {
  id: string;
  workspace: string;
  title: string;
  status: TaskStatus;
  // A day, not a time: "2026-11-02", the same wherever the person is.
  due?: string;
  // The project it is for, with the name to show (a reference, not the record).
  project?: { id: string; name: string };
  attachment?: Attachment;
  // ISO 8601.
  updatedAt: string;
}

// What a create or an edit sends: the project and the file by their ids,
// null to take one off.
export interface TaskInput {
  title?: string;
  status?: TaskStatus;
  due?: string | null;
  project?: string | null;
  attachment?: string | null;
  workspace?: string;
}

// What a page of tasks says about all the tasks that match.
export interface TaskSummary {
  // How many are past their day and not done.
  late: number;
}

export interface TaskQuery {
  workspace?: string;
  q?: string;
  status?: TaskStatus;
  // A project's tasks, by its id.
  project?: string;
  // Leave out the done ones.
  hideDone?: boolean;
  // "title:asc", "due:asc", "updated:desc".
  sort?: string;
  cursor?: string;
  limit?: number;
}

// ---- A list a page at a time (lib/pages.ts) --------------------------------

export interface Page<T, S = undefined> {
  items: T[];
  // Where the next page starts; absent on the last.
  next?: string;
  // How many match in all, for the count and a screen reader.
  total: number;
  // What the server worked out over every match, not only this page (the
  // late tasks; a list of money's totals): never summed from the rows read.
  summary?: S;
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
  // When the server ends this session (ISO), if it says: the app warns a
  // little before and offers to stay (hooks/use-session-end.ts).
  sessionEndsAt?: string;
}

// ---- Search (the palette's record search) ---------------------------------

export interface SearchHit {
  kind: "project" | "task";
  id: string;
  name: string;
  // A line under the name: the owner, the project.
  detail?: string;
  // The record's status as the server has it ("paused"), for the palette to
  // say in the person's language (lib/nav.tsx RECORD_KINDS state).
  status?: string;
}
