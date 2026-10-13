import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { platformKeys } from "@/lib/platform";
import { describe, SHORTCUT_GROUPS, SHORTCUTS } from "@/lib/shortcuts";
import { SettingsGroup, SettingsPage, SettingsRow } from "@/views/settings/rows";

// Every shortcut, searchable, grouped; the same table as the Keyboard
// shortcuts sheet (lib/shortcuts.json).
export function ShortcutsSection() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const grouped = SHORTCUT_GROUPS.map((title) => ({
    title,
    items: SHORTCUTS.filter((s) => s.group === title && (!q || describe(s).toLowerCase().includes(q) || platformKeys(s.keys).toLowerCase().includes(q))),
  })).filter((g) => g.items.length > 0);

  return (
    <SettingsPage title="Shortcuts" description="They work everywhere in the window: the app sees them first.">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input size="sm" className="ps-7" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shortcuts" aria-label="Search shortcuts" />
      </div>
      {grouped.length === 0 && <p className="text-muted-foreground text-sm">No shortcut matches “{query}”.</p>}
      {grouped.map((g) => (
        <SettingsGroup key={g.title} title={g.title}>
          {g.items.map((s) => (
            <SettingsRow key={s.id} label={describe(s)} className="min-h-10 py-2">
              <Kbd>{s.keys}</Kbd>
            </SettingsRow>
          ))}
        </SettingsGroup>
      ))}
    </SettingsPage>
  );
}
