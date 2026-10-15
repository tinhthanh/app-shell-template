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
import { client } from "@/lib/api";
import { ago, number } from "@/lib/format";
import { parseSort, sortToString } from "@/lib/list-keys";
import { useResource } from "@/lib/resource";
import { mutate, optimistic } from "@/lib/resource-cache";
import { useStore, type View } from "@/lib/store";
import { useTitle } from "@/lib/title";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hashTone, toneVar } from "@/themes/tones";
import { ViewHeader } from "@/views/view-header";

// Projects is the example resource, end to end: a list read through the
// client and kept by key, narrowed by a search, a status and tags that live
// in the URL (reload, Back and a link keep them), a detail that edits,
// changes status at once and deletes with a confirm, and a form that
// creates. Copy it for your own resources.

type StatusFilter = ProjectStatus | "";
const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

type ProjectsView = Extract<View, { kind: "projects" }>;

// The list's columns (components/data-table.tsx): what sorts, what hides on
// a narrow window, and what sits at the end.
const COLUMNS: Column<Project>[] = [
  {
    id: "name",
    label: "Name",
    sort: (a, b) => a.name.localeCompare(b.name),
    cell: (p) => (
      <span className="block min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{p.name}</span>
          <StatusBadge status={p.status} />
        </span>
        <span className="mt-0.5 block truncate text-muted-foreground text-xs">{p.description}</span>
      </span>
    ),
  },
  { id: "owner", label: "Owner", sort: (a, b) => a.owner.localeCompare(b.owner), from: "lg", className: "w-28", cell: (p) => <span className="text-muted-foreground">{p.owner}</span> },
  {
    id: "tags",
    label: "Tags",
    from: "md",
    className: "w-56",
    cell: (p) => (
      <span className="flex flex-wrap gap-1">
        {p.tags.map((t) => (
          <Tag key={t} name={t} />
        ))}
      </span>
    ),
  },
  {
    id: "updated",
    label: "Updated",
    sort: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    from: "sm",
    align: "end",
    className: "w-32",
    cell: (p) => <span className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">{ago(p.updatedAt)}</span>,
  },
];
const SORTABLE = COLUMNS.filter((c) => c.sort).map((c) => c.id);
const LIST_KEY = "projects";
const key = (id: string) => `project:${id}`;

export function ProjectsView({ id }: { id?: string }) {
  if (id) return <ProjectDetail id={id} />;
  return <ProjectList />;
}

function ProjectList() {
  const view = useStore((s) => s.view) as ProjectsView;
  const projects = useResource(() => client.projects(), [], { key: LIST_KEY });
  // The filters are the view's; typing replaces the address rather than
  // adding a history entry per letter.
  const set = (patch: Partial<ProjectsView>) => useStore.getState().setView({ ...view, ...patch }, { replace: true });
  const query = view.q ?? "";
  const status: StatusFilter = view.status ?? "";
  const tags = new Set(view.tags ?? []);

  const all = projects.status === "ready" ? projects.data : [];
  const allTags = [...new Set(all.flatMap((p) => p.tags))].sort();
  const q = query.trim().toLowerCase();
  const shown = all.filter((p) => (!q || `${p.name} ${p.description} ${p.owner}`.toLowerCase().includes(q)) && (!status || p.status === status) && [...tags].every((t) => p.tags.includes(t)));

  // Back from a project, the keyboard lands on its row.
  useReturnFocus("data-project");

  const open = (p: Project) => useStore.getState().setView({ ...view, id: p.id });

  return (
    <div className="flex h-full flex-col" data-testid="projects">
      <ViewHeader
        title="Projects"
        description={projects.status === "ready" ? `${number(all.length)} in all` : undefined}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={projects.reload} disabled={projects.loading} aria-label="Reload">
              <RefreshCwIcon className={cn(projects.loading && "animate-spin")} />
              Reload
            </Button>
            <ProjectForm onSaved={open} trigger={<Button size="sm" />} label="New project" />
          </>
        }
      />
      <ListToolbar>
        <SearchField className="w-56" value={query} onChange={(v) => set({ q: v || undefined })} placeholder="Find a project" />
        <PickOne<StatusFilter> label="Status" value={status} options={STATUSES} onChange={(v) => set({ status: v || undefined })} />
        {allTags.map((t) => (
          <FilterChip
            key={t}
            pressed={tags.has(t)}
            onPressedChange={(on) => {
              const n = new Set(tags);
              if (on) n.add(t);
              else n.delete(t);
              set({ tags: n.size ? [...n] : undefined });
            }}
          >
            {t}
          </FilterChip>
        ))}
      </ListToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ResourceView
          resource={projects}
          label="Reading projects…"
          testid="projects"
          isEmpty={(all) => all.length === 0}
          empty={
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyTitle>No projects yet</EmptyTitle>
                <EmptyDescription>Start with the first one; the rest come from your API.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <ProjectForm onSaved={open} trigger={<Button size="sm" />} label="New project" />
              </EmptyContent>
            </Empty>
          }
        >
          {() =>
            shown.length === 0 ? (
              <NothingMatches />
            ) : (
              <DataTable
                rows={shown}
                columns={COLUMNS}
                rowKey={(p) => p.id}
                sort={parseSort(view.sort, SORTABLE)}
                onSort={(sort) => set({ sort: sortToString(sort) })}
                onOpen={open}
                label="Projects"
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
      const saved = await optimistic<Project>({ key: key(id), listKey: LIST_KEY, id, patch: { status }, write: () => client.updateProject(id, { status }) });
      toastManager.add({ type: "success", title: `${saved.name} is now ${status}` });
    } catch (err) {
      toastError(err, "Couldn't update the project");
    }
  };
  const remove = () =>
    p &&
    removeRecord<Project>({
      name: p.name,
      description: "The project and its history go for good.",
      key: key(id),
      listKey: LIST_KEY,
      id,
      remove: () => client.deleteProject(id),
      after: () => useStore.getState().setView({ ...view, id: undefined }),
    });
  return (
    <DetailPage
      testid="project-detail"
      resource={project}
      label="Reading the project…"
      title={p?.name}
      crumb={{ label: "Projects", view: { ...view, id: undefined } }}
      onBack={back}
      actions={
        p && (
          <Button size="sm" variant="destructive-outline" onClick={remove}>
            <Trash2Icon />
            Delete
          </Button>
        )
      }
    >
      {(p) => (
        <div className="mx-auto w-full max-w-2xl px-8 pt-6 pb-16">
          {/* The name is the page's heading, in the strip above; here its state and what it is for. */}
          <div className="flex items-start gap-3">
            <StatusBadge status={p.status} />
            <ProjectForm
              project={p}
              onSaved={(saved) => mutate<Project>(key(id), () => saved)}
              trigger={<Button size="icon-xs" variant="ghost" aria-label="Edit the project" className="ms-auto" />}
              label={<PencilIcon />}
            />
          </div>
          <p className="mt-3 text-base">{p.description}</p>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Owner</dt>
            <dd>{p.owner}</dd>
            <dt className="text-muted-foreground">Tags</dt>
            <dd className="flex gap-1">
              {p.tags.map((t) => (
                <Tag key={t} name={t} />
              ))}
            </dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{ago(p.updatedAt)}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <PickOne label="Status" value={p.status} options={STATUSES.filter((s) => s.value) as { value: ProjectStatus; label: string }[]} onChange={(v) => void setStatus(v)} />
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
// it creates. FormDialog does the rest (components/form-dialog.tsx).
function ProjectForm({ project, onSaved, trigger, label }: { project?: Project; onSaved(saved: Project): void; trigger: React.ReactElement; label: ReactNode }) {
  return (
    <FormDialog
      trigger={trigger}
      icon={project ? undefined : <PlusIcon />}
      label={label}
      title={project ? "Edit the project" : "New project"}
      description="Its name and what it is for."
      initial={{ name: project?.name ?? "", description: project?.description ?? "" }}
      submit={project ? "Save" : "Create"}
      failTitle="Couldn't save the project"
      onSubmit={async (v) => {
        const input = { name: v.name ?? "", description: v.description ?? "" };
        const saved = project ? await client.updateProject(project.id, input) : await client.createProject(input);
        if (!project) mutate<Project[]>(LIST_KEY, (l) => l && [saved, ...l]);
        onSaved(saved);
        toastManager.add({ type: "success", title: project ? "Project saved" : `${saved.name} was created` });
      }}
    >
      {/* validate carries the app's own words, so the one FieldError shows
          them or the server's refusal, never the browser's copy. */}
      <Field name="name" validate={(v) => (String(v ?? "").trim() ? null : "A project needs a name.")}>
        <FieldLabel>
          Name
          <span aria-hidden className="text-muted-foreground">
            *
          </span>
        </FieldLabel>
        <FieldControl render={<Input defaultValue={project?.name ?? ""} aria-required maxLength={60} autoFocus />} />
        <FieldError />
      </Field>
      <Field name="description">
        <FieldLabel>Description</FieldLabel>
        <FieldControl render={<Textarea defaultValue={project?.description ?? ""} rows={3} />} />
        <FieldDescription>One line about what it is for.</FieldDescription>
      </Field>
    </FormDialog>
  );
}

// StatusBadge colours a status with the theme's state colours: green is
// active, amber paused, and archived is quiet.
function StatusBadge({ status }: { status: ProjectStatus }) {
  const tone = { active: "bg-success/16 text-success-foreground", paused: "bg-warning/16 text-warning-foreground", archived: "bg-muted text-muted-foreground" }[status];
  return <Badge className={cn("border-transparent capitalize", tone)}>{status}</Badge>;
}

// Tag wears one of the six tones (themes/tones.ts), the same for a name
// every time, and clear of the state colours.
function Tag({ name }: { name: string }) {
  const tone = toneVar(hashTone(name));
  return (
    <span className="rounded-full px-2 py-px text-[0.6875rem]" style={{ color: tone, background: `color-mix(in srgb, ${tone} 15%, transparent)` }}>
      {name}
    </span>
  );
}

export type { Project };
