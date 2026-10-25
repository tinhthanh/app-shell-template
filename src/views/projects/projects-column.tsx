import { useSyncExternalStore } from "react";
import { ink } from "@/components/ink";
import { Tip } from "@/components/tip";
import { client } from "@/lib/api";
import { ago } from "@/lib/format";
import { t } from "@/lib/i18n";

import { usePages } from "@/lib/resource";
import { cached, subscribe } from "@/lib/resource-cache";
import { useCan } from "@/lib/session";
import { useStore } from "@/lib/store";
import { type Page, PROJECT_STATUSES, type Project, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWorkspaceId, useWorkspaces } from "@/lib/workspace";
import { listKey, listOf, ProjectForm } from "@/views/projects/projects-view";

// ProjectsColumn is the sidebar's sheet while Projects is open (components/
// app-sidebar.tsx): the workspace's projects by status, each with its time,
// the open one lit, and a way to make one. It reads the list's own first
// page (the same key as the unfiltered list), so the two share one read.
// After Shipyard's worktrees beside its rail (github.com/cosscom/shipyard, MIT).

const DOT: Record<ProjectStatus, string> = { active: "bg-success", paused: "bg-warning", archived: "bg-muted-foreground/50" };
const GROUP = { active: "projects.status.active", paused: "projects.status.paused", archived: "projects.status.archived" } as const;

export default function ProjectsColumn() {
  // A workspace's list: nothing until the workspaces say which (lib/workspace.ts).
  const ready = useWorkspaces((s) => s.status !== "loading");
  return ready ? <Column /> : null;
}

// The list on screen (Projects without a record open) reads the same key:
// the column only follows what it keeps, so there is one read, and its
// failure is the list's to show. On a record's page the column reads it.
function Column() {
  const listing = useStore((s) => s.view.kind === "projects" && !s.view.id);
  // Its key names the workspace on show (listOf), so another one is another list.
  useWorkspaceId();
  const key = listKey({ kind: "projects" });
  return listing ? <Kept listKey={key} /> : <Read listKey={key} />;
}

function Read({ listKey: key }: { listKey: string }) {
  const list = usePages((page, signal) => client.projects({ ...listOf({ kind: "projects" }), ...page }, { signal }), { key });
  return <Rows rows={list.status === "ready" ? list.data.items : undefined} listKey={key} />;
}

function Kept({ listKey: key }: { listKey: string }) {
  const kept = useSyncExternalStore(
    (on) => subscribe(key, on),
    () => cached<Page<Project>>(key),
  );
  return <Rows rows={kept?.items} listKey={key} />;
}

function Rows({ rows: shown, listKey: key }: { rows: Project[] | undefined; listKey: string }) {
  const view = useStore((s) => s.view);
  const canCreate = useCan("project.create");
  const open = (p: Project) => useStore.getState().setView({ kind: "projects", id: p.id });
  const current = view.kind === "projects" ? view.id : undefined;
  const rows = shown ?? [];
  return (
    <div data-testid="projects-column" className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-7 shrink-0 items-center ps-lane pe-edge pt-3">
        <h3 className={cn("flex-1 text-label", ink.faint)}>{t("shell.place.projects")}</h3>
        {canCreate && (
          <Tip label={t("projects.column.new")} side="bottom">
            <ProjectForm
              listKey={key}
              onSaved={open}
              trigger={
                <button
                  type="button"
                  aria-label={t("projects.column.new")}
                  data-testid="column-new-project"
                  className={cn("inline-flex size-6 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-foreground [&_svg]:size-3.5", ink.glyph)}
                />
              }
              label={null}
            />
          </Tip>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-edge pt-1.5 pb-3">
        {/* Reading: said for a screen reader, and named so a picture waits for the rows. */}
        {!shown && (
          <p className="sr-only" role="status" data-testid="projects-column-loading">
            {t("projects.reading")}
          </p>
        )}
        {shown && rows.length === 0 && <p className={cn("px-2 pt-1 text-desc", ink.faint)}>{t("projects.column.empty")}</p>}
        {PROJECT_STATUSES.map((status) => {
          const group = rows.filter((p) => p.status === status);
          if (!group.length) return null;
          return (
            <section key={status} aria-label={t(GROUP[status])} className="pb-2">
              <h4 className={cn("flex h-6 items-center gap-1.5 px-2 text-tag", ink.faint)}>
                {t(GROUP[status])}
                <span className="tabular-nums">{group.length}</span>
              </h4>
              <ul className="flex flex-col gap-px">
                {group.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      data-testid="column-project"
                      data-project={p.id}
                      aria-current={p.id === current ? "page" : undefined}
                      onClick={() => open(p)}
                      className={cn(
                        "flex h-side-row w-full items-center gap-2.5 rounded-md px-2 text-start text-desc outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                        p.id === current ? "bg-sidebar-accent text-foreground" : ink.row,
                      )}
                    >
                      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[p.status])} />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className={cn("shrink-0 text-tag tabular-nums", ink.faint)}>{ago(p.updatedAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
