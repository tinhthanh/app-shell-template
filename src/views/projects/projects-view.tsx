import { ArrowLeftIcon, PencilIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { confirm } from "@/components/confirm";
import { toastError } from "@/components/error-note";
import { FilterChip } from "@/components/filter-chip";
import { PickOne } from "@/components/pick-one";
import { ResourceView } from "@/components/resource-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { ApiError, client } from "@/lib/api";
import { ago } from "@/lib/format";
import { useResource } from "@/lib/resource";
import { cached, forget, mutate } from "@/lib/resource-cache";
import { useStore, type View } from "@/lib/store";
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
const LIST_KEY = "projects";
const key = (id: string) => `project:${id}`;

// returnTo is the project the person went into, so the list puts the
// keyboard back on its row when they come back.
let returnTo: string | undefined;

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

  // Back from a project: the keyboard lands on its row.
  useEffect(() => {
    if (!returnTo || projects.status !== "ready") return;
    document.querySelector<HTMLElement>(`[data-project="${returnTo}"]`)?.focus();
    returnTo = undefined;
  }, [projects.status]);

  const open = (p: Project) => useStore.getState().setView({ ...view, id: p.id });

  return (
    <div className="flex h-full flex-col" data-testid="projects">
      <ViewHeader
        title="Projects"
        description={projects.status === "ready" ? `${all.length} in all` : undefined}
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
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2">
        <div className="relative w-56">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            size="sm"
            type="search"
            value={query}
            onChange={(e) => set({ q: e.currentTarget.value || undefined })}
            placeholder="Find a project"
            aria-label="Find a project"
            className="[&_input]:pl-7.5"
          />
        </div>
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
      </div>
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
              <p className="px-6 py-8 text-muted-foreground text-sm">Nothing matches.</p>
            ) : (
              <ul className="divide-y" aria-label="Projects">
                {shown.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      data-testid="project-row"
                      data-project={p.id}
                      onClick={() => open(p)}
                      className="flex min-h-row w-full items-center gap-4 px-6 py-row-pad text-left outline-none hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-sm">{p.name}</span>
                          <StatusBadge status={p.status} />
                        </span>
                        <span className="mt-0.5 block truncate text-muted-foreground text-xs">{p.description}</span>
                      </span>
                      <span className="hidden items-center gap-1 md:flex">
                        {p.tags.map((t) => (
                          <Tag key={t} name={t} />
                        ))}
                      </span>
                      <span className="w-20 shrink-0 text-right text-muted-foreground text-xs tabular-nums">{ago(p.updatedAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
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
  // Back to the list, with the filters it had; the row gets the keyboard.
  const back = () => {
    returnTo = id;
    useStore.getState().setView({ ...view, id: undefined });
  };
  // The status changes on screen at once and the list follows; if the
  // server refuses, it goes back and a toast says why.
  const setStatus = async (status: ProjectStatus) => {
    const before = cached<Project>(key(id));
    mutate<Project>(key(id), (x) => x && { ...x, status });
    mutate<Project[]>(LIST_KEY, (l) => l?.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      const saved = await client.updateProject(id, { status });
      mutate<Project>(key(id), () => saved);
      mutate<Project[]>(LIST_KEY, (l) => l?.map((x) => (x.id === id ? saved : x)));
      toastManager.add({ type: "success", title: `${saved.name} is now ${status}` });
    } catch (err) {
      mutate<Project>(key(id), () => before);
      mutate<Project[]>(LIST_KEY, (l) => l?.map((x) => (x.id === id && before ? before : x)));
      toastError(err, "Couldn't update the project");
    }
  };
  const remove = () =>
    p &&
    confirm({
      title: `Delete ${p.name}?`,
      description: "The project and its history go for good.",
      detail: p.name,
      confirm: "Delete",
      destructive: true,
      run: async () => {
        await client.deleteProject(id);
        forget(key(id));
        mutate<Project[]>(LIST_KEY, (l) => l?.filter((x) => x.id !== id));
        toastManager.add({ type: "success", title: `${p.name} was deleted` });
        useStore.getState().setView({ ...view, id: undefined });
      },
    });
  return (
    <div className="flex h-full flex-col" data-testid="project-detail">
      <ViewHeader
        leading={
          <Button size="icon-xs" variant="ghost" aria-label="Back to projects" data-autofocus onClick={back}>
            <ArrowLeftIcon />
          </Button>
        }
        title={
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Projects</span>
            <span aria-hidden className="text-muted-foreground/60">
              /
            </span>
            {p?.name ?? "…"}
          </span>
        }
        actions={
          p && (
            <Button size="sm" variant="destructive-outline" onClick={remove}>
              <Trash2Icon />
              Delete
            </Button>
          )
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ResourceView resource={project} label="Reading the project…" testid="project">
          {(p) => (
            <div className="mx-auto w-full max-w-2xl px-8 pt-6 pb-16">
              <div className="flex items-start gap-3">
                <h2 className="font-semibold text-xl tracking-tight">{p.name}</h2>
                <StatusBadge status={p.status} />
                <ProjectForm
                  project={p}
                  onSaved={(saved) => mutate<Project>(key(id), () => saved)}
                  trigger={<Button size="icon-xs" variant="ghost" aria-label="Edit the project" className="ml-auto" />}
                  label={<PencilIcon />}
                />
              </div>
              <p className="mt-2 text-muted-foreground text-sm">{p.description}</p>
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
        </ResourceView>
      </div>
    </div>
  );
}

// ProjectForm is the example form: a dialog with a name (required, up to
// 60 characters) and a description, validated in the app's own words and by
// the server (an ApiError with code "invalid" lands on the field it names).
// With a project it edits; without, it creates. Closing it with unsaved
// changes asks first.
function ProjectForm({ project, onSaved, trigger, label }: { project?: Project; onSaved(saved: Project): void; trigger: React.ReactElement; label: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const initial = { name: project?.name ?? "", description: project?.description ?? "" };
  const close = () => {
    setOpen(false);
    setDirty(false);
    setErrors({});
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return setOpen(true);
        if (!dirty) return close();
        // Esc, the backdrop or Cancel with edits in the fields: ask first.
        confirm({ title: "Discard your changes?", description: "What you typed here will be lost.", confirm: "Discard", destructive: true, run: close });
      }}
    >
      <DialogTrigger render={trigger}>
        {label === "New project" && <PlusIcon />}
        {label}
      </DialogTrigger>
      <DialogPopup>
        {/* The form is the popup's one child, laid out as the popup lays out
            its header, panel and footer, so the panel scrolls on a short window. */}
        <Form
          ref={form}
          className="flex min-h-0 flex-1 flex-col"
          errors={errors}
          onChange={() => {
            const f = new FormData(form.current ?? undefined);
            setDirty(String(f.get("name") ?? "") !== initial.name || String(f.get("description") ?? "") !== initial.description);
          }}
          onFormSubmit={async (values) => {
            setErrors({});
            setBusy(true);
            const input = { name: String(values.name).trim(), description: String(values.description ?? "").trim() };
            try {
              const saved = project ? await client.updateProject(project.id, input) : await client.createProject(input);
              if (!project) mutate<Project[]>(LIST_KEY, (l) => l && [saved, ...l]);
              close();
              onSaved(saved);
              toastManager.add({ type: "success", title: project ? "Project saved" : `${saved.name} was created` });
            } catch (err) {
              // The server names the field it refused; anything else is a toast.
              if (err instanceof ApiError && err.code === "invalid") setErrors({ name: err.message });
              else toastError(err, "Couldn't save the project");
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{project ? "Edit the project" : "New project"}</DialogTitle>
            <DialogDescription>Its name and what it is for.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            {/* validate carries the app's own words, so the one FieldError shows
                them or the server's refusal, never the browser's copy. */}
            <Field name="name" validate={(v) => (String(v ?? "").trim() ? null : "A project needs a name.")}>
              <FieldLabel>
                Name
                <span aria-hidden className="text-muted-foreground">
                  *
                </span>
              </FieldLabel>
              <FieldControl render={<Input defaultValue={initial.name} aria-required maxLength={60} autoFocus />} />
              <FieldError />
            </Field>
            <Field name="description">
              <FieldLabel>Description</FieldLabel>
              <FieldControl render={<Textarea defaultValue={initial.description} rows={3} />} />
              <FieldDescription>One line about what it is for.</FieldDescription>
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button type="submit" loading={busy}>
              {project ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
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
