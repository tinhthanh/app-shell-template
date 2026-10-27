---
name: add-form
description: Add a form that creates or edits a record in a dialog, with validation, the server's refusal on the right field, a dirty check and tests. Use when asked for a "new X" or "edit X" dialog, or any fields that save through the API.
---

# Add a form

A form is a `FormDialog` (`src/components/form-dialog.tsx`). It owns the
trigger, the busy Save, the dirty check (closing with edits asks first),
the app's own field errors and the server's refusal on the field it
names. You write the fields and the save. `ProjectForm` in
`src/views/projects/projects-view.tsx` is the worked example.

1. **The dialog**. Every word in it is a key, `t("reports.…")`, from
   `src/lib/messages/reports.ts` (`en`, then `vi` with the same keys and
   blanks, spread into `src/lib/messages/index.ts`); `pnpm check:words`
   refuses English written into a view. Offer the trigger only to whoever
   may create (`useCan`, with the action in `ACTIONS` in
   `lib/permissions.ts`), as `ProjectList` does:

   ```tsx
   const canCreate = useCan("report.create");
   …
   {canCreate && (
     <FormDialog
       trigger={<Button size="sm" />}
       icon={<PlusIcon />}
       label={t("reports.new")}
       title={t("reports.new")}
       description={t("reports.form.description")}
       initial={{ title: "", scope: "" }}          // every field, as it starts: the dirty check compares with these
       submit={t("common.create")}
       failTitle={t("reports.saveFailed")}
       onSubmit={async (v) => {                      // v: the fields, trimmed; throw to refuse
         const saved = await client.createReport({ title: v.title ?? "", scope: v.scope ?? "" });
         mutate<Page<Report>>(listKey, (l) => editRows(l, (rows) => [saved, ...rows]) as Page<Report> | undefined);   // the key the list was read under (usePages)
         invalidate(listKey);                        // where it falls under each filter and sort is the server's to say
         onSaved(saved);
         toastManager.add({ type: "success", title: t("reports.created", { name: saved.title }) });
       }}
     >
       …fields…
     </FormDialog>
   )}
   ```

   A short list read whole with `useResource` is a plain array under its
   key: `mutate<Report[]>("reports", (l) => l && [saved, ...l])`. For an
   edit, pass the record's values as `initial`, `submit={t("common.save")}`,
   and `client.updateReport` in `onSubmit`, behind `useCan("report.edit")`;
   the trigger can be an icon button with `aria-label={t("reports.edit")}`.

2. **A text field**, validated in the app's own words (the one `FieldError`
   shows them or the server's refusal, never the browser's copy):

   ```tsx
   <Field name="title" validate={(v) => (String(v ?? "").trim() ? null : t("reports.title.needed"))}>
     <FieldLabel>{t("reports.title")}<span aria-hidden className="text-muted-foreground">*</span></FieldLabel>
     <FieldControl render={<Input defaultValue={initial.title} aria-required maxLength={80} autoFocus />} />
     <FieldError />
   </Field>
   ```

   A longer one is `<Textarea rows={3} />`; a hint goes in `<FieldDescription>`.

3. **A choice** goes through a control that carries `name`, so the value
   reaches `onSubmit`: the kit's `Select` (`src/components/ui/select.tsx`,
   `name` and `defaultValue` on the root) or a `RadioGroup` inside the
   `Field`. `SimpleSelect` is for toolbars and filters: it has no `name`.
   The Kit's Overlays › Form dialog (`src/views/kit/kit-view.tsx`) is the
   worked example: a `Field` with a `FieldLabel` around a `Select` whose
   `name` is in `initial`, so the trigger is named by the label and the
   dirty check (which reads the form when the dialog is asked to close)
   sees a choice changed as it sees typing.
   Put a unit case in `mock.test.ts` that the value arrives, and a browser
   test that the choice is kept.

   **Fields beyond words**, as `TaskForm` (`src/views/tasks/tasks-view.tsx`)
   has them:
   - **A day**: `<FieldControl render={<Input type="date" />} />`. Its value
     is `2026-11-02` (the contract's `format: date`), the browser draws it in
     the person's language, and the page reads it back with `day()` (never
     `date()`, which is a time and would move a day across time zones);
     `today()` says whether it is past. Send `null` to take it off.
   - **A record** (a task's project): `RecordPicker`
     (`src/components/record-picker.tsx`) inside a `Field`, with `name`,
     `initial` and a `find(query, signal)` that asks the server (a page of the
     list with `q`); its value in the form is the record's id, "" for none.
     One the form can't do without: `required` on the picker and a `validate`
     on its `Field` in the app's words (`v ? null : t("reports.owner.needed")`),
     as the Kit's Overlays › Form dialog has it.
   - **A file**: `FileField` (`src/components/file-field.tsx`) gives the
     choice (keep, new, none) through `onChoice`, kept in a ref; on save, a
     new file goes to `client.uploadFile` first and the record names it by
     its id, `null` takes it off. Say a too-big file on the field before it
     is sent (`MAX_FILE`, `src/lib/upload.ts`), as the server will. Sending
     is its own action, `file.upload` (`lib/permissions.ts`), shared by every
     resource that takes a file: don't guard it with your resource's edit.

4. **The server's refusal**: the mock throws
   `new ApiError("A report needs a title.", 422, "invalid", "title")`; the
   HTTP client reads `{ error, code, field }` from the body. `FormDialog`
   puts the message on that field, or on the first field in `initial`
   when the server named none. Anything else is a toast with `failTitle`.

5. **Tests** (`e2e/reports.spec.ts`), one behaviour each:
   - the empty field shows the app's own words and nothing is sent;
   - a refusal from the server (a taken title) lands on the field (the
     fixtures have one to collide with);
   - a save closes the dialog, toasts, and the row is there (create) or
     changed (edit);
   - edits then Esc show "Discard your changes?"; Keep editing keeps the
     dialog, Discard closes it;
   - `failWrites=1`: the toast with `failTitle`, the record as it was.
   An axe scene in `e2e/a11y.spec.ts` with the dialog open and an error
   showing.

Then `pnpm check` and the spec; a new dialog changes no baseline unless a
visual scene opens it.
