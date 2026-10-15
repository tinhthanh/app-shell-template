import type { SettingsSectionId, View } from "./store.ts";
import type { ProjectStatus } from "./types.ts";
import { PROJECT_STATUSES } from "./types.ts";

// Each view's address, as the URL's hash: #/projects, #/projects/p-shop,
// #/projects?q=shop&status=active&tags=web,ops, #/settings/appearance. The hash, not the path, so the app is one file
// that any static host serves without a rewrite rule. lib/store.ts keeps
// the hash and the view in step. Pure, so routes.test.ts runs it in node.

const SECTIONS: SettingsSectionId[] = ["general", "appearance", "shortcuts", "about"];
const STATUSES: readonly ProjectStatus[] = PROJECT_STATUSES;

// query writes a view's filters after the path, leaving out what is unset.
function query(v: { q?: string; status?: string; tags?: string[]; sort?: string }): string {
  const p = new URLSearchParams();
  if (v.q) p.set("q", v.q);
  if (v.status) p.set("status", v.status);
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
    case "kit":
      return v.section ? `#/kit/${encodeURIComponent(v.section)}` : "#/kit";
    case "settings":
      return v.section ? `#/settings/${v.section}` : "#/settings";
  }
}

// hashToView reads an address; anything it doesn't know is Home.
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
    case "kit":
      return arg ? { kind: "kit", section: arg } : { kind: "kit" };
    case "settings":
      return arg && (SECTIONS as string[]).includes(arg) ? { kind: "settings", section: arg as SettingsSectionId } : { kind: "settings" };
    default:
      return { kind: "home" };
  }
}
