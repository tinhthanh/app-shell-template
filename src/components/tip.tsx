import type { ReactElement, ReactNode } from "react";

import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { platformKeys } from "@/lib/platform";
import { cn } from "@/lib/utils";

// Tip gives an element a tooltip: the app's own, not the browser's title,
// so it appears on hover and on keyboard focus alike. The element is the
// trigger itself, so it keeps its own props and ref. No label, no tooltip.
//
// A disabled button gets no pointer events, so its tooltip, often the
// reason it is disabled, would never show. While the child is disabled it
// sits in a span that is the trigger instead; `wrapClassName` sizes that
// span (w-full for a full-width button).
//
// `delay` overrides the app's 300ms for rows people sweep the pointer over,
// like the sidebar's, where a tooltip at every row would be noise.
export function Tip({
  label,
  side,
  align,
  delay,
  className,
  wrapClassName,
  children,
}: {
  label: ReactNode;
  // inline-end is the side after the text: the right, or the left in a right-to-left page.
  side?: "top" | "bottom" | "left" | "right" | "inline-end" | "inline-start";
  align?: "start" | "center" | "end";
  delay?: number;
  className?: string;
  wrapClassName?: string;
  children: ReactElement;
}) {
  if (label == null || label === false || label === "") return children;
  // "Search (⌘K)" is "Search (Ctrl+K)" on Linux.
  if (typeof label === "string") label = platformKeys(label);
  const disabled = !!(children.props as { disabled?: unknown }).disabled;
  const trigger = disabled ? (
    <span data-slot="tip-disabled" className={cn("inline-flex", wrapClassName)}>
      {children}
    </span>
  ) : (
    children
  );
  return (
    <Tooltip>
      <TooltipTrigger delay={delay} render={trigger} />
      <TooltipPopup side={side} align={align} className={className}>
        {label}
      </TooltipPopup>
    </Tooltip>
  );
}
