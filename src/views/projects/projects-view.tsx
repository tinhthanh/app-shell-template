import { ArrowLeftIcon, PencilIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { ErrorNote, toastError } from "@/components/error-note";
import { FilterChip } from "@/components/filter-chip";
import { PickOne } from "@/components/pick-one";
import { PixelLoader } from "@/components/pixel-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { ApiError, client } from "@/lib/api";
import { ago } from "@/lib/format";
import { useResource } from "@/lib/resource";
import { useStore } from "@/lib/store";
import { hashTone, toneVar } from "@/themes/tones";
import type { Project, ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ViewHeader } from "@/views/view-header";

// Projects is the example list view: read through the API client, drawn in
// its three states (loading, failed, here), narrowed by a search, a status
// and tags, with a detail that writes back. Copy it for your own resources.

type StatusFilter = ProjectStatus | "";
const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

export function ProjectsView({ id }: { id?: string }) {
  if (id) return <ProjectDetail id={id} />;
  return <ProjectList />;
}

function ProjectList() {
  const projects = useResource(() => client.projects(), []);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [tags, setTags] = useState<Set<string>>(new Set());

  const all = projects.data ?? [];
  const allTags = [...new Set(all.flatMap((p) => p.tags))].sort();
  const q = query.trim().toLowerCase();
  const shown = all.filter((p) => (!q || `${p.name} ${p.description} ${p.owner}`.toLowerCase().includes(q)) && (!status || p.status === status) && [...tags].every((t) => p.tags.includes(t)));

  return (
    <div className="flex h-full flex-col" data-testid="projects">
      <ViewHeader
        title="Projects"
        description={projects.data ? `${all.length} in all` : undefined}
        actions={
          <Button size="sm" variant="outline" onClick={projects.reload} disabled={projects.loading} aria-label="Reload">
            <RefreshCwIcon className={cn(projects.loading && "animate-spin")} />
            Reload
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2 border-b px-6 py-2">
        <div className="relative w-56">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input size="sm" type="search" value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder="Find a project" aria-label="Find a project" className="[&_input]:pl-7.5" />
        </div>
        <PickOne<StatusFilter> label="Status" value={status} options={STATUSES} onChange={setStatus} />
        {allTags.map((t) => (
          <FilterChip
            key={t}
            pressed={tags.has(t)}
            onPressedChange={(on) =>
              setTags((s) => {
                const n = new Set(s);
                if (on) n.add(t);
                else n.delete(t);
                return n;
              })
            }
          >
            {t}
          </FilterChip>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {projects.error && !projects.data ? (
          <Failed error={projects.error} onRetry={projects.reload} />
        ) : !projects.data ? (
          <div className="flex h-full items-center justify-center" data-testid="projects-loading">
            <PixelLoader label="Reading projects…" />
          </div>
        ) : all.length === 0 ? (
          <Empty className="h-full" data-testid="projects-empty">
            <EmptyHeader>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>When your API has some, they show here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : shown.length === 0 ? (
          <p className="px-6 py-8 text-muted-foreground text-sm">Nothing matches.</p>
        ) : (
          <ul className="divide-y" aria-label="Projects">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  data-testid="project-row"
                  data-project={p.id}
                  onClick={() => useStore.getState().setView({ kind: "projects", id: p.id })}
                  className="flex min-h-row w-full items-center gap-4 px-6 py-row-pad text-left outline-none hover:bg-accent/50 focus-visible:bg-accent/50"
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
        )}
      </div>
    </div>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const project = useResource(() => client.project(id), [id]);
  const back = () => useStore.getState().setView({ kind: "projects" });
  const setStatus = async (status: ProjectStatus) => {
    try {
      await client.updateProject(id, { status });
      project.reload();
      toastManager.add({ type: "success", title: `${project.data?.name ?? "Project"} is now ${status}` });
    } catch (err) {
      toastError(err, "Couldn't update the project");
    }
  };
  const p = project.data;
  return (
    <div className="flex h-full flex-col" data-testid="project-detail">
      <ViewHeader
        title={
          <span className="flex items-center gap-2">
            <Button size="icon-xs" variant="ghost" aria-label="Back to projects" onClick={back}>
              <ArrowLeftIcon />
            </Button>
            <span className="text-muted-foreground">Projects</span>
            <span className="text-muted-foreground/60">/</span>
            {p?.name ?? "…"}
          </span>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {project.error && !p ? (
          <Failed error={project.error} onRetry={project.reload} />
        ) : !p ? (
          <div className="flex h-full items-center justify-center">
            <PixelLoader label="Reading the project…" />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-2xl px-8 pt-6 pb-16">
            <div className="flex items-start gap-3">
              <h2 className="font-semibold text-xl tracking-tight">{p.name}</h2>
              <StatusBadge status={p.status} />
              <EditProject project={p} onSaved={project.reload} />
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
      </div>
    </div>
  );
}

// Failed is a read that didn't come back, in plain words (lib/explain.ts),
// with what the server said behind Details.
function Failed({ error, onRetry }: { error: unknown; onRetry(): void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-8 pt-8" data-testid="projects-failed">
      <ErrorNote error={error} onRetry={onRetry} />
    </div>
  );
}

// EditProject is the example form: a dialog with a name (required, up to
// 60 characters) and a description, validated as the browser does and by
// the server (an ApiError with code "invalid" lands on the field it names).
function EditProject({ project, onSaved }: { project: Project; onSaved(): void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon-xs" variant="ghost" aria-label="Edit the project" className="ml-auto" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogPopup>
        <Form
          errors={errors}
          onFormSubmit={async (values) => {
            setErrors({});
            setBusy(true);
            try {
              await client.updateProject(project.id, { name: String(values.name).trim(), description: String(values.description ?? "").trim() });
              setOpen(false);
              onSaved();
              toastManager.add({ type: "success", title: "Project saved" });
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
            <DialogTitle>Edit the project</DialogTitle>
            <DialogDescription>Its name and what it is for.</DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <Field name="name">
              <FieldLabel>Name</FieldLabel>
              <FieldControl render={<Input defaultValue={project.name} required maxLength={60} autoFocus />} />
              <FieldError match="valueMissing">A project needs a name.</FieldError>
              <FieldError />
            </Field>
            <Field name="description">
              <FieldLabel>Description</FieldLabel>
              <FieldControl render={<Textarea defaultValue={project.description} rows={3} />} />
              <FieldDescription>One line about what it is for.</FieldDescription>
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button type="submit" loading={busy}>
              Save
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
    <span className="rounded-full px-2 py-px text-[11px]" style={{ color: tone, background: `color-mix(in srgb, ${tone} 15%, transparent)` }}>
      {name}
    </span>
  );
}

export type { Project };
