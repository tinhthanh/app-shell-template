import { useEffect } from "react";

import { OVERLAYS } from "@/lib/overlays";

// Focus is designed: when what had the keyboard goes away (a dialog, sheet
// or popover closes and its opener is gone, a pane closes, a step of a page
// changes), the keyboard lands somewhere sensible, never on <body>. Only the
// DOM is read here, so the ui primitives can use it without importing the
// stores.
//
// Home is, in order: the focused pane, if a view marks one with
// data-pane-focused (its first field or control), something a view marked
// with data-focus-home or data-row, and else the main area itself.

const FIELD = "[contenteditable=true], textarea:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled])";
const CONTROL = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

// Shown and reachable: not under an inert region.
const shown = (el: Element): el is HTMLElement => el instanceof HTMLElement && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[inert]");

// firstFocusable is where the keyboard starts inside a region: what a view
// marked data-autofocus, else its first field, else its first control.
export function firstFocusable(root: ParentNode | null | undefined, keep: (el: HTMLElement) => boolean = () => true): HTMLElement | undefined {
  if (!root) return undefined;
  for (const sel of ["[data-autofocus]", FIELD, CONTROL]) {
    // data-focus-skip: a way back, or a toolbar's refresh, which is never
    // where a step starts.
    const hit = [...root.querySelectorAll(sel)].find((el): el is HTMLElement => shown(el) && keep(el) && !el.closest("[data-focus-skip]"));
    if (hit) return hit;
  }
  return undefined;
}

export function homeTarget(): HTMLElement | undefined {
  const main = document.querySelector("main");
  if (!main) return undefined;
  const pane = [...main.querySelectorAll("[data-pane-focused]")].find(shown);
  if (pane) {
    // The pane's own content, past a split pane's header buttons.
    const t = firstFocusable(pane, (el) => !el.closest(".group\\/header"));
    if (t) return t;
  }
  const marked = [...main.querySelectorAll("[data-focus-home], [data-row]")].find(shown);
  if (marked) return marked;
  if (main instanceof HTMLElement) {
    if (!main.hasAttribute("tabindex")) main.tabIndex = -1;
    main.style.outline = "none";
    return main;
  }
  return undefined;
}

const lost = () => {
  const a = document.activeElement;
  return !a || a === document.body || !a.isConnected;
};

// focusHome moves the keyboard home now, unless an overlay has it.
export function focusHome(): boolean {
  if (document.querySelector(OVERLAYS)) return false;
  const t = homeTarget();
  t?.focus({ preventScroll: true });
  return !!t && document.activeElement === t;
}

// rescueFocus waits for whatever is about to take the keyboard (a primitive
// returning focus to its trigger, a view's own autofocus), then sends it
// home if nothing did. Safe to call from anywhere and more than once.
let pending = 0;
export function rescueFocus(delay = 60) {
  window.clearTimeout(pending);
  pending = window.setTimeout(() => {
    if (lost()) focusHome();
  }, delay);
}

// FocusRescue goes inside a dialog, sheet or popover popup: when the popup
// unmounts and its opener is gone (a menu item, a closed pane, a confirm
// opened by a shortcut), the keyboard goes home instead of to <body>.
export function FocusRescue(): null {
  useEffect(() => () => rescueFocus(), []);
  return null;
}

// useRescueRemovedFocus is the window's net: when what had the keyboard is
// taken out of the page (a permission answered, a form submitted, a row
// that redraws), the keyboard goes home rather than to <body>. Only then:
// a click on the page's background, which leaves the last control in
// place, is left alone, so a selection being made isn't disturbed.
export function useRescueRemovedFocus() {
  useEffect(() => {
    let last: Element | null = null;
    const onIn = (e: FocusEvent) => {
      last = e.target instanceof Element ? e.target : null;
    };
    const mo = new MutationObserver(() => {
      if (!last || !lost()) return;
      // Looked at once per loss: gone, or hidden with its tab, it is
      // rescued; still there, the person clicked away from it.
      const gone = !last.isConnected || last.getClientRects().length === 0;
      last = null;
      if (gone) rescueFocus();
    });
    document.addEventListener("focusin", onIn);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("focusin", onIn);
      mo.disconnect();
    };
  }, []);
}
