import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// SearchField is the app's search box: a magnifier at the start of an
// Input of type search (role searchbox, so tests find it by its label),
// which the projects and tasks lists, the themes and the shortcuts share.
export function SearchField({ value, onChange, placeholder, label, className }: { value: string; onChange(value: string): void; placeholder: string; label?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 start-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input size="sm" type="search" value={value} onChange={(e) => onChange(e.currentTarget.value)} placeholder={placeholder} aria-label={label ?? placeholder} className="[&_input]:ps-7.5" />
    </div>
  );
}
