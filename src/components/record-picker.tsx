import { useEffect, useRef, useState } from "react";

import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup, ComboboxStatus } from "@/components/ui/combobox";
import { useSettled } from "@/hooks/use-settled";
import { t } from "@/lib/i18n";

// RecordPicker is a form field that points at another record (a task's
// project): type a few letters, the server finds the ones that match
// (find, called off when the typing moves on), pick one. Its value in the
// form is the record's id (name), the empty string for none. Put it in a
// Field with a FieldLabel, as any control; components/ui/combobox.tsx draws it.
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
}: {
  name: string;
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
      <ComboboxInput placeholder={placeholder} showClear clearProps={{ "aria-label": t("common.picker.clear") }} data-testid={`picker-${name}`} />
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
