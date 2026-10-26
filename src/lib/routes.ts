import type { SettingsSectionId, View } from "./store.ts";
import type { ProjectStatus, TaskStatus } from "./types.ts";
import { PROJECT_STATUSES, TASK_STATUSES } from "./types.ts";

// Each view's address, as the URL's hash: #/projects, #/projects/p-shop,
// #/projects?q=shop&status=active&tags=web,ops, #/settings/appearance. The hash, not the path, so the app is one file
// that any static host serves without a rewrite rule. lib/store.ts keeps
// the hash and the view in step. Pure, so routes.test.ts runs it in node.

const SECTIONS: SettingsSectionId[] = ["general", "appearance", "shortcuts", "about"];
const STATUSES: readonly ProjectStatus[] = PROJECT_STATUSES;
const TASK_STATUS: readonly TaskStatus[] = TASK_STATUSES;

// query writes a view's filters after the path, leaving out what is unset.
function query(v: { q?: string; status?: string; tags?: string[]; project?: string; sort?: string }): string {
  const p = new URLSearchParams();
  if (v.q) p.set("q", v.q);
  if (v.status) p.set("status", v.status);
  if (v.project) p.set("project", v.project);
  if (v.tags?.length) p.set("tags", v.tags.join(","));
  if (v.sort) p.set("sort", v.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function viewToHash(v: View): string {
  switch (v.kind) {
    case "home":
      return "";
    case "projects":
      return `${v.id ? `#/projects/${encodeURIComponent(v.id)}` : "#/projects"}${query(v)}`;
    case "tasks":
      return `${v.id ? `#/tasks/${encodeURIComponent(v.id)}` : "#/tasks"}${query(v)}`;
    case "kit":
      return v.section ? `#/kit/${encodeURIComponent(v.section)}` : "#/kit";
    case "settings":
      return v.section ? `#/settings/${v.section}` : "#/settings";
    case "missing":
      return `#/${v.path}`;
  }
}

// hashToView reads an address: none is Home, one it doesn't know is missing.
export function hashToView(hash: string): View {
  const [path = "", search = ""] = hash.split("?", 2);
  const parts = path
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  const [kind, arg] = parts;
  switch (kind) {
    case "projects": {
      const p = new URLSearchParams(search);
      const status = p.get("status");
      const tags = (p.get("tags") ?? "").split(",").filter(Boolean);
      return {
        kind: "projects",
        ...(arg ? { id: arg } : {}),
        ...(p.get("q") ? { q: p.get("q") as string } : {}),
        ...(status && (STATUSES as string[]).includes(status) ? { status: status as ProjectStatus } : {}),
        ...(tags.length ? { tags } : {}),
        ...(p.get("sort") ? { sort: p.get("sort") as string } : {}),
      };
    }
    case "tasks": {
      const p = new URLSearchParams(search);
      const status = p.get("status");
      return {
        kind: "tasks",
        ...(arg ? { id: arg } : {}),
        ...(p.get("q") ? { q: p.get("q") as string } : {}),
        ...(status && (TASK_STATUS as string[]).includes(status) ? { status: status as TaskStatus } : {}),
        ...(p.get("project") ? { project: p.get("project") as string } : {}),
        ...(p.get("sort") ? { sort: p.get("sort") as string } : {}),
      };
    }
    case "kit":
      return arg ? { kind: "kit", section: arg } : { kind: "kit" };
    case "settings":
      return arg && (SECTIONS as string[]).includes(arg) ? { kind: "settings", section: arg as SettingsSectionId } : { kind: "settings" };
    case undefined:
      return { kind: "home" };
    default:
      return { kind: "missing", path: hash.replace(/^#\/?/, "") };
  }
}
