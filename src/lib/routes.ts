import type { SettingsSectionId, View } from "./store.ts";

// Each view's address, as the URL's hash: #/projects, #/projects/p-shop,
// #/settings/appearance. The hash, not the path, so the app is one file
// that any static host serves without a rewrite rule. lib/store.ts keeps
// the hash and the view in step. Pure, so routes.test.ts runs it in node.

const SECTIONS: SettingsSectionId[] = ["general", "appearance", "shortcuts", "about"];

export function viewToHash(v: View): string {
  switch (v.kind) {
    case "home":
      return "";
    case "projects":
      return v.id ? `#/projects/${encodeURIComponent(v.id)}` : "#/projects";
    case "kit":
      return v.section ? `#/kit/${encodeURIComponent(v.section)}` : "#/kit";
    case "settings":
      return v.section ? `#/settings/${v.section}` : "#/settings";
  }
}

// hashToView reads an address; anything it doesn't know is Home.
export function hashToView(hash: string): View {
  const parts = hash
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
    case "projects":
      return arg ? { kind: "projects", id: arg } : { kind: "projects" };
    case "kit":
      return arg ? { kind: "kit", section: arg } : { kind: "kit" };
    case "settings":
      return arg && (SECTIONS as string[]).includes(arg) ? { kind: "settings", section: arg as SettingsSectionId } : { kind: "settings" };
    default:
      return { kind: "home" };
  }
}
