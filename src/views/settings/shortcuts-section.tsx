import { useState } from "react";

import { SearchField } from "@/components/search-field";
import { Kbd } from "@/components/ui/kbd";
import { t } from "@/lib/i18n";
import { platformKeys } from "@/lib/platform";
import { describe, groupName, SHORTCUT_GROUPS, SHORTCUTS } from "@/lib/shortcuts";
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
    <SettingsPage title={t("settings.section.shortcuts")} description={t("settings.shortcuts.description")}>
      <SearchField value={query} onChange={setQuery} placeholder={t("settings.shortcuts.search")} />
      {grouped.length === 0 && <p className="text-muted-foreground text-sm">{t("settings.shortcuts.noMatch", { query })}</p>}
      {grouped.map((g) => (
        <SettingsGroup key={g.title} title={groupName(g.title)}>
          {g.items.map((s) => (
            <SettingsRow key={s.id} label={describe(s)}>
              <Kbd>{s.keys}</Kbd>
            </SettingsRow>
          ))}
        </SettingsGroup>
      ))}
    </SettingsPage>
  );
}
