import { useEffect, useRef, useState } from "react";

import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxStatus } from "@/components/ui/combobox";
import { useSettled } from "@/hooks/use-settled";
import { t } from "@/lib/i18n";

// RecordPicker is a form field that points at another record (a task's
// project): type a few letters, the server finds the ones that match
// (find, called off when the typing moves on), pick one. Its value in the
// form is the record's id (name), the empty string for none. Put it in a
// Field with a FieldLabel, as any control; components/ui/combobox.tsx draws it.
// A record the form can't do without: required here, and the Field's
// validate says so in the app's words (validate={(v) => (v ? null : t(…))}),
// as a text field's does. RecordFilter (record-filter.tsx) is the same
// search in a list's toolbar.
export interface Picked {
  id: string;
  name: string;
}

export function RecordPicker({
  name,
  initial,
  find,
  placeholder,
  empty,
  onPick,
  required,
  label,
  testid,
}: {
  // The form's field; none for a picker that only reports (a filter).
  name?: string;
  required?: boolean;
  // Its name for a screen reader when no FieldLabel gives one (a toolbar).
  label?: string;
  testid?: string;
  initial?: Picked | null;
  find(query: string, signal: AbortSignal): Promise<Picked[]>;
  placeholder?: string;
  // What the list says when nothing matches.
  empty: string;
  onPick?(picked: Picked | null): void;
}) {
  const [value, setValue] = useState<Picked | null>(initial ?? null);
  const [query, setQuery] = useState("");
  const asked = useSettled(query);
  const [items, setItems] = useState<Picked[]>(initial ? [initial] : []);
  // A new initial (the address changed, or the record's name came after its
  // id) is shown in place: the field isn't drawn again, so the keyboard stays.
  const initialId = initial?.id;
  const initialName = initial?.name;
  // A name not known yet (only the id) keeps the one shown for that id.
  useEffect(() => {
    setValue((shown) => {
      if (!initialId) return null;
      const known = initialName && initialName !== initialId ? initialName : shown?.id === initialId ? shown.name : initialId;
      const next = { id: initialId, name: known };
      setItems((now) => [next, ...now.filter((p) => p.id !== next.id)]);
      return next;
    });
  }, [initialId, initialName]);
  const [failed, setFailed] = useState(false);
  // The latest find, so a new closure each render doesn't ask again; what is asked is the query.
  const finder = useRef(find);
  finder.current = find;
  useEffect(() => {
    const ctrl = new AbortController();
    finder.current(asked, ctrl.signal).then(
      (found) => {
        setItems(found);
        setFailed(false);
      },
      () => !ctrl.signal.aborted && setFailed(true),
    );
    return () => ctrl.abort();
  }, [asked]);
  return (
    <Combobox<Picked>
      name={name}
      required={required}
      items={items}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onPick?.(v);
      }}
      onInputValueChange={setQuery}
      // The server has matched already.
      filter={null}
      itemToStringLabel={(p) => p.name}
      itemToStringValue={(p) => p.id}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <ComboboxInput
        placeholder={placeholder}
        aria-label={label}
        showClear
        clearProps={{ "aria-label": t("common.picker.clear") }}
        triggerProps={{ "aria-label": t("common.picker.open") }}
        data-testid={testid ?? `picker-${name}`}
      />
      <ComboboxPopup>
        <ComboboxStatus className="sr-only">{failed ? t("common.picker.failed") : null}</ComboboxStatus>
        <ComboboxEmpty>{failed ? t("common.picker.failed") : empty}</ComboboxEmpty>
        <ComboboxList>
          {(p: Picked) => (
            <ComboboxItem key={p.id} value={p}>
              {p.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}
