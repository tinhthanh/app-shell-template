import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hashTone, toneVar } from "@/themes/tones";

// The two small marks a row wears: a record's state, and its tags. A view
// says which tone each of its states takes and the word for it; the marks
// are drawn here, the same in every view.
//
//   const STATE = { active: { tone: "success", word: "projects.state.active" }, … } satisfies Record<ProjectStatus, { tone: StatusTone; word: Key }>;
//   <StatusBadge tone={STATE[p.status].tone}>{t(STATE[p.status].word)}</StatusBadge>

export type StatusTone = "success" | "warning" | "info" | "destructive" | "muted";

// The theme's state colours: green succeeds, amber waits, blue informs, red
// fails, and quiet is a state that is over.
const TONE: Record<StatusTone, string> = {
  success: "bg-success/16 text-success-foreground",
  warning: "bg-warning/16 text-warning-foreground",
  info: "bg-info/16 text-info-foreground",
  destructive: "bg-destructive/16 text-destructive-foreground",
  muted: "bg-muted text-muted-foreground",
};

// StatusBadge is a state in its colour. The word comes lower case from the
// catalogue and its first letter is raised in an inline block (a flex badge
// has no first letter of its own), so "đang hoạt động" isn't capitalised
// word by word as CSS capitalize would.
export function StatusBadge({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <Badge className={cn("border-transparent", TONE[tone], className)}>
      <span className="inline-block first-letter:uppercase">{children}</span>
    </Badge>
  );
}

// Tag wears one of the six tones (themes/tones.ts), the same for a name
// every time, and clear of the state colours.
export function Tag({ name }: { name: string }) {
  const tone = toneVar(hashTone(name));
  return (
    <span className="rounded-full px-2 py-px text-tag" style={{ color: tone, background: `color-mix(in srgb, ${tone} 15%, transparent)` }}>
      {name}
    </span>
  );
}
