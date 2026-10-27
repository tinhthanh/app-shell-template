import { SearchIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { type Key, t } from "@/lib/i18n";
import { openSettings, type SettingsSectionId } from "@/lib/store";
import { cn } from "@/lib/utils";

// "Find a setting", at the top of every section: typing lists the sections
// that have what you typed, by their names and the words people look for
// them with (lib/messages/settings.ts, in the language in use); ↑ and ↓
// light one, Enter opens the lit one and a click opens the one clicked. No shortcut of its own: ⌘F is the browser's
// find, and Tab reaches it. After Shipyard's (github.com/cosscom/shipyard, MIT).

const INDEX: { id: SettingsSectionId; title: Key; words: Key }[] = [
  { id: "general", title: "settings.section.general", words: "settings.findWords.general" },
  { id: "appearance", title: "settings.section.appearance", words: "settings.findWords.appearance" },
  { id: "shortcuts", title: "settings.section.shortcuts", words: "settings.findWords.shortcuts" },
  { id: "about", title: "settings.section.about", words: "settings.findWords.about" },
];

function matches(q: string) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return INDEX.filter((s) => {
    const hay = `${t(s.title)} ${t(s.words)}`.toLowerCase();
    return terms.every((term) => hay.includes(term));
  });
}

export function SettingsFind() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const found = useMemo(() => matches(q), [q]);

  const go = (id: SettingsSectionId) => {
    setQ("");
    setOpen(false);
    openSettings(id);
  };

  return (
    <div className="relative w-52 shrink-0 max-md:hidden">
      <label className="flex h-8 items-center gap-2 rounded-lg bg-muted px-2.5 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/40">
        <SearchIcon className="size-3.5 shrink-0" aria-hidden />
        <input
          ref={input}
          type="search"
          value={q}
          role="combobox"
          aria-expanded={open && Boolean(q.trim())}
          aria-controls="settings-found"
          aria-activedescendant={open && found[at] ? `settings-found-${found[at].id}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setAt(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setAt((i) => Math.min(i + 1, found.length - 1));
            else if (e.key === "ArrowUp") setAt((i) => Math.max(i - 1, 0));
            else if (e.key === "Enter" && found[at]) go(found[at].id);
            else if (e.key === "Escape" && q) {
              // Esc clears the field first; a second Esc leaves Settings.
              e.stopPropagation();
              setQ("");
            } else return;
            e.preventDefault();
          }}
          placeholder={t("settings.find")}
          aria-label={t("settings.find")}
          data-testid="settings-find"
          data-esc-leaves
          className="min-w-0 flex-1 bg-transparent text-desc text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      {open && q.trim() && (
        <div
          id="settings-found"
          role="listbox"
          aria-label={t("settings.findFound")}
          className="absolute end-0 top-9 z-20 w-64 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {found.length === 0 ? (
            <div className="px-2.5 py-2 text-meta text-muted-foreground">{t("settings.findNothing", { query: q.trim() })}</div>
          ) : (
            found.map((s, i) => (
              <div
                key={s.id}
                id={`settings-found-${s.id}`}
                role="option"
                tabIndex={-1}
                aria-selected={i === at}
                onMouseDown={(e) => {
                  // The field keeps the keyboard; the click picks.
                  e.preventDefault();
                  go(s.id);
                }}
                onMouseEnter={() => setAt(i)}
                className={cn("flex w-full cursor-default items-center rounded-md px-2.5 py-1.5 text-start text-desc", i === at && "bg-accent")}
              >
                {t(s.title)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
