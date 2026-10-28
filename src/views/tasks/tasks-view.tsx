import { FileIcon, PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { type Column, DataTable } from "@/components/data-table";
import { DetailPage } from "@/components/detail-page";
import { ErrorNote, toastError } from "@/components/error-note";
import { type FileChoice, FileField } from "@/components/file-field";
import { FilterChip } from "@/components/filter-chip";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar, NothingMatches } from "@/components/list-page";
import { PickOne } from "@/components/pick-one";
import { PixelLoader } from "@/components/pixel-loader";
import { RecordFilter } from "@/components/record-filter";
import { RecordPicker } from "@/components/record-picker";
import { removeRecord } from "@/components/remove-record";
import { ResourceView } from "@/components/resource-view";
import { SearchField } from "@/components/search-field";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldControl, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { returnFocusTo, useReturnFocus } from "@/hooks/use-return-focus";
import { useSettled } from "@/hooks/use-settled";
import { track } from "@/lib/analytics";
import { ApiError, client, listQuery } from "@/lib/api";
import { withDefault } from "@/lib/default-filter";
import { ago, day, fileSize, today } from "@/lib/format";
import { type Key, t } from "@/lib/i18n";
import { parseSort, sortToString } from "@/lib/list-keys";
import { notify } from "@/lib/notifications";
import { editRows } from "@/lib/pages";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { withRecent } from "@/lib/recent";
import { usePages, useResource } from "@/lib/resource";
import { invalidate, mutate, optimistic } from "@/lib/resource-cache";
import { useCan } from "@/lib/session";
import { useStore, type View } from "@/lib/store";
import { useTitle } from "@/lib/title";
import type { Page, Task, TaskInput, TaskQuery, TaskStatus } from "@/lib/types";
import { TASK_STATUSES } from "@/lib/types";
import { MAX_FILE } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { loadWorkspaces, pickWorkspace, useWorkspaceId, useWorkspaces } from "@/lib/workspace";
import { ViewHeader } from "@/views/view-header";

// Tasks is the second resource, after Projects (views/projects/): the same
// list, record and form, with the fields beyond words. A due day (a native
// date field, written and read as a day by lib/format.ts, late in the
// warning tone), the project it is for (a RecordPicker that asks the server
// as the person types) and a file (a FileField, sent with client.uploadFile
// before the task is saved). The list is narrowed by a project (a
// RecordFilter, ?project=, which a project's page links here with) and hides
// done tasks when the person's "Hide done tasks" setting says so and the
// address doesn't (lib/default-filter.ts).

type TasksView = Extract<View, { kind: "tasks" }>;
type StatusFilter = TaskStatus | "";

const STATE = {
  todo: { tone: "muted", word: "tasks.state.todo", now: "tasks.nowTodo", label: "tasks.status.todo" },
  doing: { tone: "info", word: "tasks.state.doing", now: "tasks.nowDoing", label: "tasks.status.doing" },
  done: { tone: "success", word: "tasks.state.done", now: "tasks.nowDone", label: "tasks.status.done" },
} satisfies Record<TaskStatus, { tone: StatusTone; word: Key; now: Key; label: Key }>;

const statuses = (): { value: StatusFilter; label: string }[] => [{ value: "", label: t("tasks.status.all") }, ...TASK_STATUSES.map((s) => ({ value: s, label: t(STATE[s].label) }))];

// late says a task is past its day and not done.
const late = (task: Task) => Boolean(task.due && task.status !== "done" && task.due < today());

function TaskState({ status }: { status: TaskStatus }) {
  return <StatusBadge tone={STATE[status].tone}>{t(STATE[status].word)}</StatusBadge>;
}

// Due is a task's day, in the warning tone with a word when it is late.
function Due({ task }: { task: Task }) {
  if (!task.due) return <span className="text-muted-foreground">{t("tasks.noDue")}</span>;
  return (
    <span className={cn("whitespace-nowrap tabular-nums", late(task) && "text-warning-foreground")}>
      {day(task.due)}
      {late(task) && <span className="ms-1.5 text-meta">· {t("tasks.late")}</span>}
    </span>
  );
}

const columns = (): Column<Task>[] => [
  {
    id: "title",
    label: t("tasks.column.task"),
    sort: "server",
    cell: (task) => (
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-row">{task.title}</span>
        <TaskState status={task.status} />
        {task.attachment && <FileIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={task.attachment.name} />}
      </span>
    ),
  },
  { id: "project", label: t("tasks.column.project"), from: "md", className: "w-44", cell: (task) => <span className="truncate text-muted-foreground">{task.project?.name ?? "—"}</span> },
  { id: "due", label: t("tasks.column.due"), sort: "server", from: "sm", className: "w-40", cell: (task) => <Due task={task} /> },
  {
    id: "updated",
    label: t("tasks.column.updated"),
    sort: "server",
    from: "lg",
    align: "end",
    className: "w-32",
    cell: (task) => <span className="whitespace-nowrap text-muted-foreground text-meta tabular-nums">{ago(task.updatedAt)}</span>,
  },
];
const SORTABLE = columns()
  .filter((c) => c.sort)
  .map((c) => c.id);
const key = (id: string) => `task:${id}`;

// What the list asks the server for: the view's filters, in the workspace on show.
export const listOf = (v: TasksView): TaskQuery => ({
  workspace: usePrefs.getState().workspace ?? undefined,
  q: v.q?.trim() || undefined,
  status: v.status,
  project: v.project,
  // A status asked for wins over hiding the done ones.
  hideDone: v.done === "hide" && !v.status ? true : undefined,
  sort: parseSort(v.sort, SORTABLE) && v.sort,
});
export const listKey = (v: TasksView) => `tasks${listQuery(listOf(v))}`;

export function TasksView({ id }: { id?: string }) {
  if (id) return <TaskDetail id={id} />;
  return <TaskList />;
}

function TaskList() {
  const workspaces = useWorkspaces((s) => s.status);
  if (workspaces === "loading")
    return (
      <div className="flex h-full items-center justify-center" data-testid="tasks-loading">
        <PixelLoader label={t("tasks.reading")} />
      </div>
    );
  if (workspaces === "failed")
    return (
      <div className="mx-auto w-full max-w-xl px-page pt-8" data-testid="tasks-failed">
        <ErrorNote error={useWorkspaces.getState().error} onRetry={() => void loadWorkspaces(() => client.workspaces())} />
      </div>
    );
  return <WorkspaceTasks />;
}

function WorkspaceTasks() {
  const view = useStore((s) => s.view) as TasksView;
  const canCreate = useCan("task.create");
  // Read again in another workspace (the key names it).
  useWorkspaceId();
  // Hide done tasks (Settings › General) is this list's default: written into
  // the address when it names neither done nor a status (lib/default-filter.ts),
  // and read with from the first render, so the done ones never flash by.
  const hideDone = usePrefs((p) => p.hideDoneTasks);
  const defaulted = withDefault(view, "done", hideDone ? "hide" : undefined, ["status"]);
  useEffect(() => {
    if (defaulted) useStore.getState().setView(defaulted, { replace: true });
  }, [defaulted]);
  const shown = defaulted ?? view;
  const asked = { ...shown, q: useSettled(view.q) };
  const lk = listKey(asked);
  const tasks = usePages((page, signal) => client.tasks({ ...listOf(asked), ...page }, { signal }), { key: lk });
  const set = (patch: Partial<TasksView>) => useStore.getState().setView({ ...shown, ...patch }, { replace: true });
  const status: StatusFilter = view.status ?? "";
  const filtered = Boolean(view.q?.trim() || status || view.project || view.done === "hide");
  const backTo = useReturnFocus("data-task");
  const open = (task: Task) => useStore.getState().setView({ ...view, id: task.id });
  // The project filter's name: the first task names it, or its id until one does.
  // The filter's project, read under the key its page uses, so its name is
  // known whatever the list holds (none matching, another filter loading).
  const filterProject = useResource((signal) => (view.project ? client.project(view.project, { signal }) : Promise.resolve(undefined)), [view.project], {
    key: view.project ? `project:${view.project}` : undefined,
  });
  const projectName = filterProject.status === "ready" ? filterProject.data?.name : undefined;
  return (
    <div className="flex h-full flex-col" data-testid="tasks">
      <ViewHeader
        title={t("tasks.title")}
        description={tasks.status === "ready" ? t(filtered ? "tasks.countMatch" : "tasks.countAll", { n: tasks.data.total }) : undefined}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={tasks.reload} disabled={tasks.loading} aria-label={t("common.reload")}>
              <RefreshCwIcon className={cn(tasks.loading && "animate-spin")} />
              {t("common.reload")}
            </Button>
            {canCreate && <TaskForm listKey={lk} onSaved={open} trigger={<Button size="sm" />} label={t("tasks.new")} />}
          </>
        }
      />
      <ListToolbar>
        <SearchField className="w-56" value={view.q ?? ""} onChange={(v) => set({ q: v || undefined })} placeholder={t("tasks.find")} />
        <PickOne<StatusFilter> label={t("tasks.status")} value={status} options={statuses()} onChange={(v) => set({ status: v || undefined })} />
        <RecordFilter
          label={t("tasks.column.project")}
          testid="tasks-project-filter"
          scope={usePrefs.getState().workspace ?? undefined}
          value={view.project ? { id: view.project, name: projectName ?? view.project } : null}
          empty={t("tasks.field.project.none")}
          find={async (q, signal) =>
            (await client.projects({ workspace: usePrefs.getState().workspace ?? undefined, q: q || undefined, limit: 20 }, { signal })).items.map((p) => ({ id: p.id, name: p.name }))
          }
          onChange={(p) => set({ project: p?.id })}
        />
        {!status && (
          <FilterChip pressed={view.done === "hide"} onPressedChange={(on) => set({ done: on ? "hide" : "show" })}>
            {t("tasks.hideDone")}
          </FilterChip>
        )}
      </ListToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ResourceView
          resource={tasks}
          label={t("tasks.reading")}
          testid="tasks"
          isEmpty={(page) => page.items.length === 0 && !filtered}
          empty={
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyTitle>{t("tasks.empty.title")}</EmptyTitle>
                <EmptyDescription>{canCreate ? t("tasks.empty.canCreate") : t("tasks.empty.cannotCreate")}</EmptyDescription>
              </EmptyHeader>
              {canCreate && (
                <EmptyContent>
                  <TaskForm listKey={lk} onSaved={open} trigger={<Button size="sm" />} label={t("tasks.new")} />
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
                more={tasks.more}
                focusRow={backTo}
                columns={columns()}
                rowKey={(task) => task.id}
                sort={parseSort(view.sort, SORTABLE)}
                onSort={(sort) => set({ sort: sortToString(sort) })}
                onOpen={open}
                label={t("tasks.title")}
                rowTestId="task-row"
                rowProps={(task) => ({ "data-task": task.id, "data-late": late(task) ? "true" : undefined })}
              />
            )
          }
        </ResourceView>
      </div>
    </div>
  );
}

function TaskDetail({ id }: { id: string }) {
  const view = useStore((s) => s.view) as TasksView;
  const canEdit = useCan("task.edit");
  const canDelete = useCan("task.delete");
  const task = useResource((signal) => client.task(id, { signal }), [id], { key: key(id) });
  const found = task.status === "ready" ? task.data : undefined;
  useTitle(found?.title);
  // From another of the person's workspaces (a link, the palette), it brings its own.
  const home = found?.workspace;
  const ours = useWorkspaces((s) => Boolean(home) && s.list.some((w) => w.id === home));
  useEffect(() => {
    if (home && ours) pickWorkspace(home);
  }, [home, ours]);
  const opened = found?.title;
  useEffect(() => {
    if (opened) setPrefs({ recent: withRecent(usePrefs.getState().recent, { kind: "task", id, name: opened }) });
  }, [id, opened]);
  const back = () => {
    returnFocusTo("data-task", id);
    useStore.getState().setView({ ...view, id: undefined });
  };
  const setStatus = async (status: TaskStatus) => {
    try {
      const saved = await optimistic<Task>({ key: key(id), listKey: listKey(view), id, patch: { status }, write: () => client.updateTask(id, { status }) });
      notify({ title: t(STATE[status].now, { name: saved.title }), tone: "success", action: { label: t("shell.notice.open"), view: { kind: "tasks", id } } });
      track("record.status", { kind: "task", status });
    } catch (err) {
      toastError(err, t("tasks.updateFailed"));
    }
  };
  const remove = () =>
    found &&
    removeRecord({
      name: found.title,
      description: t("tasks.delete.description"),
      key: key(id),
      listKey: listKey(view),
      id,
      remove: () => client.deleteTask(id),
      after: () => {
        setPrefs({ recent: usePrefs.getState().recent.filter((r) => !(r.kind === "task" && r.id === id)) });
        useStore.getState().setView({ ...view, id: undefined });
      },
    });
  return (
    <DetailPage
      testid="task-detail"
      resource={task}
      label={t("tasks.readingOne")}
      title={found?.title}
      crumb={{ label: t("tasks.title"), view: { ...view, id: undefined } }}
      onBack={back}
      actions={
        found &&
        canDelete && (
          <Button size="sm" variant="destructive-outline" onClick={remove}>
            <Trash2Icon />
            {t("common.delete")}
          </Button>
        )
      }
    >
      {(task) => (
        <div className="mx-auto w-full max-w-2xl px-page pt-6 pb-16">
          <div className="flex items-start gap-3">
            <TaskState status={task.status} />
            {canEdit && (
              <TaskForm
                task={task}
                onSaved={(saved) => mutate<Task>(key(id), () => saved)}
                trigger={<Button size="icon-xs" variant="ghost" aria-label={t("tasks.edit")} className="ms-auto" />}
                label={<PencilIcon />}
              />
            )}
          </div>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body">
            <dt className="text-muted-foreground">{t("tasks.field.project")}</dt>
            <dd>
              {task.project ? (
                <button type="button" className="underline-offset-2 hover:underline" onClick={() => useStore.getState().setView({ kind: "projects", id: task.project?.id })}>
                  {task.project.name}
                </button>
              ) : (
                <span className="text-muted-foreground">{t("tasks.noProject")}</span>
              )}
            </dd>
            <dt className="text-muted-foreground">{t("tasks.field.due")}</dt>
            <dd data-testid="task-due">
              <Due task={task} />
            </dd>
            <dt className="text-muted-foreground">{t("tasks.field.attachment")}</dt>
            <dd data-testid="task-file">
              {task.attachment ? (
                <span className="flex items-center gap-2">
                  <FileIcon className="size-3.5 text-muted-foreground" aria-hidden />
                  {task.attachment.name}
                  <span className="text-muted-foreground text-meta tabular-nums">{fileSize(task.attachment.size)}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{t("tasks.noFile")}</span>
              )}
            </dd>
            <dt className="text-muted-foreground">{t("tasks.column.updated")}</dt>
            <dd>{ago(task.updatedAt)}</dd>
            <dt className="text-muted-foreground">{t("tasks.status")}</dt>
            <dd className={cn(!canEdit && "first-letter:uppercase")}>
              {canEdit ? (
                <PickOne label={t("tasks.status")} value={task.status} options={statuses().filter((s) => s.value) as { value: TaskStatus; label: string }[]} onChange={(v) => void setStatus(v)} />
              ) : (
                t(STATE[task.status].word)
              )}
            </dd>
          </dl>
        </div>
      )}
    </DetailPage>
  );
}

// TaskForm makes or edits a task with every kind of field: words (the
// title), a day (a native date field: its value is the day as the contract
// writes it, and the browser draws it in the person's language), a record
// (RecordPicker over the workspace's projects) and a file (FileField: a new
// one goes to client.uploadFile first, and the task names it by its id).
export function TaskForm({ task, listKey, onSaved, trigger, label }: { task?: Task; listKey?: string; onSaved(saved: Task): void; trigger: React.ReactElement; label: ReactNode }) {
  const file = useRef<FileChoice>({ kind: "keep" });
  return (
    <FormDialog
      trigger={trigger}
      icon={task ? undefined : <PlusIcon />}
      label={label}
      title={task ? t("tasks.edit") : t("tasks.new")}
      description={t("tasks.form.description")}
      initial={{ title: task?.title ?? "", project: task?.project?.id ?? "", due: task?.due ?? "", attachment: task?.attachment?.id ?? "" }}
      submit={task ? t("common.save") : t("common.create")}
      failTitle={t("tasks.saveFailed")}
      onOpen={() => {
        file.current = { kind: "keep" };
      }}
      onSubmit={async (v) => {
        const choice = file.current;
        // Too big is said on the field before anything is sent.
        if (choice.kind === "new" && choice.file.size > MAX_FILE) throw new ApiError(t("tasks.field.attachment.tooBig"), 422, "invalid", "attachment");
        const attachment = choice.kind === "new" ? (await client.uploadFile(choice.file)).id : choice.kind === "none" ? null : undefined;
        const input: TaskInput = { title: v.title ?? "", project: v.project || null, due: v.due || null, ...(attachment !== undefined ? { attachment } : {}) };
        const saved = task ? await client.updateTask(task.id, input) : await client.createTask({ ...input, title: input.title ?? "", workspace: usePrefs.getState().workspace ?? undefined });
        if (!task && listKey) mutate<Page<Task>>(listKey, (l) => editRows(l, (rows) => [saved, ...rows]) as Page<Task> | undefined);
        if (!task) track("record.create", { kind: "task" });
        invalidate(listKey ?? "tasks");
        file.current = { kind: "keep" };
        onSaved(saved);
        toastManager.add({ type: "success", title: task ? t("tasks.saved") : t("tasks.created", { name: saved.title }) });
      }}
    >
      <Field name="title" validate={(value) => (String(value ?? "").trim() ? null : t("tasks.field.title.needed"))}>
        <FieldLabel>
          {t("tasks.field.title")}
          <span aria-hidden className="text-muted-foreground">
            *
          </span>
        </FieldLabel>
        <FieldControl render={<Input defaultValue={task?.title ?? ""} aria-required maxLength={80} autoFocus />} />
        <FieldError />
      </Field>
      <Field name="project">
        <FieldLabel>{t("tasks.field.project")}</FieldLabel>
        <RecordPicker
          name="project"
          initial={task?.project ?? null}
          placeholder={t("tasks.field.project.hint")}
          empty={t("tasks.field.project.none")}
          find={async (q, signal) =>
            (await client.projects({ workspace: usePrefs.getState().workspace ?? undefined, q: q || undefined, limit: 20 }, { signal })).items.map((p) => ({ id: p.id, name: p.name }))
          }
        />
        <FieldError />
      </Field>
      <Field name="due">
        <FieldLabel>{t("tasks.field.due")}</FieldLabel>
        <FieldControl render={<Input type="date" defaultValue={task?.due ?? ""} className="w-48" />} />
        <FieldError />
      </Field>
      <FileField
        name="attachment"
        label={t("tasks.field.attachment")}
        hint={t("tasks.field.attachment.hint")}
        kept={task?.attachment}
        onChoice={(c) => {
          file.current = c;
        }}
      />
    </FormDialog>
  );
}
