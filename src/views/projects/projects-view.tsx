import { PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";

import { type Column, DataTable } from "@/components/data-table";
import { DetailPage } from "@/components/detail-page";
import { toastError } from "@/components/error-note";
import { FilterChip } from "@/components/filter-chip";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar, NothingMatches } from "@/components/list-page";
import { PickOne } from "@/components/pick-one";
import { removeRecord } from "@/components/remove-record";
import { ResourceView } from "@/components/resource-view";
import { SearchField } from "@/components/search-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { returnFocusTo, useReturnFocus } from "@/hooks/use-return-focus";
import { client, listQuery } from "@/lib/api";
import { ago, number } from "@/lib/format";
import { t } from "@/lib/i18n";
import { parseSort, sortToString } from "@/lib/list-keys";
import { editRows } from "@/lib/pages";
import { usePages, useResource } from "@/lib/resource";
import { mutate, optimistic } from "@/lib/resource-cache";
import { useCan } from "@/lib/session";
import { useStore, type View } from "@/lib/store";
import { useTitle } from "@/lib/title";
import type { Page, Project, ProjectQuery, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hashTone, toneVar } from "@/themes/tones";
import { ViewHeader } from "@/views/view-header";

// Projects is the example resource, end to end: a list read a page at a
// time through the client, filtered and sorted by the server and kept by
// key, narrowed by a search, a status and tags that live in the URL
// (reload, Back and a link keep them), a detail that edits,
// changes status at once and deletes with a confirm, and a form that
// creates. Copy it for your own resources.

type StatusFilter = ProjectStatus | "";
// statuses is the status filter's choices, in the language in use, so it is
// called in render rather than kept from when the module loaded.
const statuses = (): { value: StatusFilter; label: string }[] => [
  { value: "", label: t("projects.status.all") },
  { value: "active", label: t("projects.status.active") },
  { value: "paused", label: t("projects.status.paused") },
  { value: "archived", label: t("projects.status.archived") },
];

// A status as a word in a sentence or a badge (lower case; the page raises its first letter), and the toast when it changes.
const STATE_WORD = { active: "projects.state.active", paused: "projects.state.paused", archived: "projects.state.archived" } as const;
const NOW = { active: "projects.nowActive", paused: "projects.nowPaused", archived: "projects.nowArchived" } as const;

type ProjectsView = Extract<View, { kind: "projects" }>;

// columns is the list's columns (components/data-table.tsx): what sorts,
// what hides on a narrow window, and what sits at the end. A function, so
// the headers are in the language in use when the list draws.
const columns = (): Column<Project>[] => [
  {
    id: "name",
    label: t("projects.name"),
    sort: "server",
    cell: (p) => (
      <span className="block min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-row">{p.name}</span>
          <StatusBadge status={p.status} />
        </span>
        <span className="mt-0.5 block truncate text-muted-foreground text-meta">{p.description}</span>
      </span>
    ),
  },
  { id: "owner", label: t("projects.owner"), sort: "server", from: "lg", className: "w-28", cell: (p) => <span className="text-muted-foreground">{p.owner}</span> },
  {
    id: "tags",
    label: t("projects.tags"),
    from: "md",
    className: "w-56",
    cell: (p) => (
      <span className="flex flex-wrap gap-1">
        {p.tags.map((tag) => (
          <Tag key={tag} name={tag} />
        ))}
      </span>
    ),
  },
  {
    id: "updated",
    label: t("projects.updated"),
    sort: "server",
    from: "sm",
    align: "end",
    className: "w-32",
    cell: (p) => <span className="whitespace-nowrap text-muted-foreground text-meta tabular-nums">{ago(p.updatedAt)}</span>,
  },
];
// Only the ids are kept, so reading the headers once at load is harmless.
const SORTABLE = columns()
  .filter((c) => c.sort)
  .map((c) => c.id);
const key = (id: string) => `project:${id}`;

// What the list asks the server for, from the view's filters; each one is
// kept under its own key, so a filter that comes back draws at once.
const listOf = (v: ProjectsView): ProjectQuery => ({ q: v.q?.trim() || undefined, status: v.status, tags: v.tags, sort: parseSort(v.sort, SORTABLE) && v.sort });
const listKey = (v: ProjectsView) => `projects${listQuery(listOf(v))}`;

export function ProjectsView({ id }: { id?: string }) {
  if (id) return <ProjectDetail id={id} />;
  return <ProjectList />;
}

function ProjectList() {
  const view = useStore((s) => s.view) as ProjectsView;
  // What isn't the person's to do isn't offered (lib/permissions.ts); the server still decides.
  const canCreate = useCan("project.create");
  const lk = listKey(view);
  const projects = usePages((page) => client.projects({ ...listOf(view), ...page }), { key: lk });
  const tagsInUse = useResource(() => client.projectTags(), [], { key: "project-tags" });
  // The filters are the view's; typing replaces the address rather than
  // adding a history entry per letter.
  const set = (patch: Partial<ProjectsView>) => useStore.getState().setView({ ...view, ...patch }, { replace: true });
  const query = view.q ?? "";
  const status: StatusFilter = view.status ?? "";
  const tags = new Set(view.tags ?? []);

  // A tag that is set stays a chip even if no project wears it any more.
  const allTags = [...new Set([...(tagsInUse.status === "ready" ? tagsInUse.data : []), ...tags])].sort();
  const filtered = Boolean(query.trim() || status || tags.size);

  // Back from a project, the keyboard lands on its row.
  const backTo = useReturnFocus("data-project");

  const open = (p: Project) => useStore.getState().setView({ ...view, id: p.id });

  return (
    <div className="flex h-full flex-col" data-testid="projects">
      <ViewHeader
        title={t("projects.title")}
        description={projects.status === "ready" ? t(filtered ? "projects.countMatch" : "projects.countAll", { n: number(projects.data.total) }) : undefined}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={projects.reload} disabled={projects.loading} aria-label={t("common.reload")}>
              <RefreshCwIcon className={cn(projects.loading && "animate-spin")} />
              {t("common.reload")}
            </Button>
            {canCreate && <ProjectForm listKey={lk} onSaved={open} trigger={<Button size="sm" />} label={t("projects.new")} />}
          </>
        }
      />
      <ListToolbar>
        <SearchField className="w-56" value={query} onChange={(v) => set({ q: v || undefined })} placeholder={t("projects.find")} />
        <PickOne<StatusFilter> label={t("projects.status")} value={status} options={statuses()} onChange={(v) => set({ status: v || undefined })} />
        {allTags.map((tag) => (
          <FilterChip
            key={tag}
            pressed={tags.has(tag)}
            onPressedChange={(on) => {
              const n = new Set(tags);
              if (on) n.add(tag);
              else n.delete(tag);
              set({ tags: n.size ? [...n] : undefined });
            }}
          >
            {tag}
          </FilterChip>
        ))}
      </ListToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ResourceView
          resource={projects}
          label={t("projects.reading")}
          testid="projects"
          isEmpty={(page) => page.items.length === 0 && !filtered}
          empty={
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyTitle>{t("projects.empty.title")}</EmptyTitle>
                <EmptyDescription>{canCreate ? t("projects.empty.canCreate") : t("projects.empty.cannotCreate")}</EmptyDescription>
              </EmptyHeader>
              {canCreate && (
                <EmptyContent>
                  <ProjectForm listKey={lk} onSaved={open} trigger={<Button size="sm" />} label={t("projects.new")} />
                </EmptyContent>
              )}
            </Empty>
          }
        >
          {(page) =>
            page.items.length === 0 ? (
              <NothingMatches />
            ) : (
              <DataTable
                rows={page.items}
                total={page.total}
                more={projects.more}
                focusRow={backTo}
                columns={columns()}
                rowKey={(p) => p.id}
                sort={parseSort(view.sort, SORTABLE)}
                onSort={(sort) => set({ sort: sortToString(sort) })}
                onOpen={open}
                label={t("projects.title")}
                rowTestId="project-row"
                rowProps={(p) => ({ "data-project": p.id })}
              />
            )
          }
        </ResourceView>
      </div>
    </div>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const view = useStore((s) => s.view) as ProjectsView;
  const canEdit = useCan("project.edit");
  const canDelete = useCan("project.delete");
  const project = useResource(() => client.project(id), [id], { key: key(id) });
  const p = project.status === "ready" ? project.data : undefined;
  useTitle(p?.name);
  // Back to the list, with the filters it had; the row gets the keyboard.
  const back = () => {
    returnFocusTo("data-project", id);
    useStore.getState().setView({ ...view, id: undefined });
  };
  // The status changes on screen at once and the list follows; if the
  // server refuses, it goes back and a toast says why.
  const setStatus = async (status: ProjectStatus) => {
    try {
      const saved = await optimistic<Project>({ key: key(id), listKey: listKey(view), id, patch: { status }, write: () => client.updateProject(id, { status }) });
      toastManager.add({ type: "success", title: t(NOW[status], { name: saved.name }) });
    } catch (err) {
      toastError(err, t("projects.updateFailed"));
    }
  };
  const remove = () =>
    p &&
    removeRecord<Project>({
      name: p.name,
      description: t("projects.deleteDescription"),
      key: key(id),
      listKey: listKey(view),
      id,
      remove: () => client.deleteProject(id),
      after: () => useStore.getState().setView({ ...view, id: undefined }),
    });
  return (
    <DetailPage
      testid="project-detail"
      resource={project}
      label={t("projects.readingOne")}
      title={p?.name}
      crumb={{ label: t("projects.title"), view: { ...view, id: undefined } }}
      onBack={back}
      actions={
        p &&
        canDelete && (
          <Button size="sm" variant="destructive-outline" onClick={remove}>
            <Trash2Icon />
            {t("common.delete")}
          </Button>
        )
      }
    >
      {(p) => (
        <div className="mx-auto w-full max-w-2xl px-8 pt-6 pb-16">
          {/* The name is the page's heading, in the strip above; here its state and what it is for. */}
          <div className="flex items-start gap-3">
            <StatusBadge status={p.status} />
            {canEdit && (
              <ProjectForm
                project={p}
                onSaved={(saved) => mutate<Project>(key(id), () => saved)}
                trigger={<Button size="icon-xs" variant="ghost" aria-label={t("projects.edit")} className="ms-auto" />}
                label={<PencilIcon />}
              />
            )}
          </div>
          <p className="mt-3 text-body">{p.description}</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body">
            <dt className="text-muted-foreground">{t("projects.owner")}</dt>
            <dd>{p.owner}</dd>
            <dt className="text-muted-foreground">{t("projects.tags")}</dt>
            <dd className="flex gap-1">
              {p.tags.map((tag) => (
                <Tag key={tag} name={tag} />
              ))}
            </dd>
            <dt className="text-muted-foreground">{t("projects.updated")}</dt>
            <dd>{ago(p.updatedAt)}</dd>
            <dt className="text-muted-foreground">{t("projects.status")}</dt>
            <dd className={cn(!canEdit && "first-letter:uppercase")}>
              {canEdit ? (
                <PickOne label={t("projects.status")} value={p.status} options={statuses().filter((s) => s.value) as { value: ProjectStatus; label: string }[]} onChange={(v) => void setStatus(v)} />
              ) : (
                t(STATE_WORD[p.status])
              )}
            </dd>
          </dl>
        </div>
      )}
    </DetailPage>
  );
}

// ProjectForm is the example form: a name (required, up to 60 characters)
// and a description, validated in the app's own words and by the server (a
// refusal lands on the field it names). With a project it edits; without,
// it creates, at the top of the list it was opened from (listKey).
// FormDialog does the rest (components/form-dialog.tsx).
function ProjectForm({ project, listKey, onSaved, trigger, label }: { project?: Project; listKey?: string; onSaved(saved: Project): void; trigger: React.ReactElement; label: ReactNode }) {
  return (
    <FormDialog
      trigger={trigger}
      icon={project ? undefined : <PlusIcon />}
      label={label}
      title={project ? t("projects.edit") : t("projects.new")}
      description={t("projects.form.description")}
      initial={{ name: project?.name ?? "", description: project?.description ?? "" }}
      submit={project ? t("common.save") : t("common.create")}
      failTitle={t("projects.saveFailed")}
      onSubmit={async (v) => {
        const input = { name: v.name ?? "", description: v.description ?? "" };
        const saved = project ? await client.updateProject(project.id, input) : await client.createProject(input);
        if (!project && listKey) mutate<Page<Project>>(listKey, (l) => editRows(l, (rows) => [saved, ...rows]) as Page<Project> | undefined);
        onSaved(saved);
        toastManager.add({ type: "success", title: project ? t("projects.saved") : t("projects.created", { name: saved.name }) });
      }}
    >
      {/* validate carries the app's own words, so the one FieldError shows
          them or the server's refusal, never the browser's copy. */}
      <Field name="name" validate={(v) => (String(v ?? "").trim() ? null : t("projects.name.needed"))}>
        <FieldLabel>
          {t("projects.name")}
          <span aria-hidden className="text-muted-foreground">
            *
          </span>
        </FieldLabel>
        <FieldControl render={<Input defaultValue={project?.name ?? ""} aria-required maxLength={60} autoFocus />} />
        <FieldError />
      </Field>
      <Field name="description">
        <FieldLabel>{t("projects.description")}</FieldLabel>
        <FieldControl render={<Textarea defaultValue={project?.description ?? ""} rows={3} />} />
        <FieldDescription>{t("projects.description.hint")}</FieldDescription>
      </Field>
    </FormDialog>
  );
}

// StatusBadge colours a status with the theme's state colours: green is
// active, amber paused, and archived is quiet. The word is the catalogue's,
// lower case, its first letter raised in an inline block (a flex badge has
// no first letter of its own), so "Đang hoạt động" isn't capitalised word by word.
function StatusBadge({ status }: { status: ProjectStatus }) {
  const tone = { active: "bg-success/16 text-success-foreground", paused: "bg-warning/16 text-warning-foreground", archived: "bg-muted text-muted-foreground" }[status];
  return (
    <Badge className={cn("border-transparent", tone)}>
      <span className="inline-block first-letter:uppercase">{t(STATE_WORD[status])}</span>
    </Badge>
  );
}

// Tag wears one of the six tones (themes/tones.ts), the same for a name
// every time, and clear of the state colours.
function Tag({ name }: { name: string }) {
  const tone = toneVar(hashTone(name));
  return (
    <span className="rounded-full px-2 py-px text-tag" style={{ color: tone, background: `color-mix(in srgb, ${tone} 15%, transparent)` }}>
      {name}
    </span>
  );
}

export type { Project };
