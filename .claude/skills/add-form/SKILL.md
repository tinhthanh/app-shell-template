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

1. **The dialog**:

   ```tsx
   <FormDialog
     trigger={<Button size="sm" />}
     icon={<PlusIcon />}
     label="New report"
     title="New report"
     description="Its title and what it covers."
     initial={{ title: "", scope: "" }}          // every field, as it starts: the dirty check compares with these
     submit="Create"
     failTitle="Couldn't save the report"
     onSubmit={async (v) => {                      // v: the fields, trimmed; throw to refuse
       const saved = await client.createReport({ title: v.title ?? "", scope: v.scope ?? "" });
       mutate<Report[]>("reports", (l) => l && [saved, ...l]);
       onSaved(saved);
       toastManager.add({ type: "success", title: `${saved.title} was created` });
     }}
   >
     …fields…
   </FormDialog>
   ```

   For an edit, pass the record's values as `initial`, `submit="Save"`, and
   `client.updateReport` in `onSubmit`; the trigger can be an icon button
   with `aria-label`.

2. **A text field**, validated in the app's own words (the one `FieldError`
   shows them or the server's refusal, never the browser's copy):

   ```tsx
   <Field name="title" validate={(v) => (String(v ?? "").trim() ? null : "A report needs a title.")}>
     <FieldLabel>Title<span aria-hidden className="text-muted-foreground">*</span></FieldLabel>
     <FieldControl render={<Input defaultValue={initial.title} aria-required maxLength={80} autoFocus />} />
     <FieldError />
   </Field>
   ```

   A longer one is `<Textarea rows={3} />`; a hint goes in `<FieldDescription>`.

3. **A choice** goes through a control that carries `name`, so the value
   reaches `onSubmit`: the kit's `Select` (`src/components/ui/select.tsx`,
   `name` and `defaultValue` on the root) or a `RadioGroup` inside the
   `Field`. `SimpleSelect` is for toolbars and filters: it has no `name`.
   Put a unit case in `mock.test.ts` that the value arrives, and a browser
   test that the choice is kept.

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
