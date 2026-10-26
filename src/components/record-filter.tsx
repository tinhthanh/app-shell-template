import { type Picked, RecordPicker } from "@/components/record-picker";

// RecordFilter narrows a list to one other record's rows (a project's
// tasks) from its toolbar: the RecordPicker's search as the person types,
// the pick written to the View by the caller (so the address carries it),
// cleared with its ✕. value is the record in the address, with the name to
// show: the caller knows it from a row, or shows the id until it does.
export function RecordFilter({
  label,
  value,
  find,
  empty,
  onChange,
  testid,
}: {
  label: string;
  value: Picked | null;
  find(query: string, signal: AbortSignal): Promise<Picked[]>;
  empty: string;
  onChange(picked: Picked | null): void;
  testid?: string;
}) {
  return (
    <div className="w-52">
      {/* Keyed by the record, so a link or Back that changes it starts the field afresh. */}
      <RecordPicker key={value?.id ?? ""} label={label} placeholder={label} initial={value} find={find} empty={empty} onPick={onChange} testid={testid} />
    </div>
  );
}
