import { useEffect, useState } from "react";

// Dialogs, alerts and sheets are portalled straight into <body>, so
// watching its children is enough to know when one is open.
const MODALS = '[data-slot="dialog-popup"], [data-slot="alert-dialog-popup"], [data-slot="sheet-popup"]';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// useModalBox says where the open dialog, alert or sheet is on screen (the
// one on top, when one opens another), or undefined while none is. It
// follows the popup as it grows, and the window as it resizes.
export function useModalBox(): Box | undefined {
  const [box, setBox] = useState<Box>();
  useEffect(() => {
    let watched: Element | undefined;
    let ro: ResizeObserver | undefined;
    const measure = () => {
      const all = document.querySelectorAll(MODALS);
      const el = all[all.length - 1];
      if (el !== watched) {
        ro?.disconnect();
        ro = undefined;
        watched = el;
        if (el) {
          ro = new ResizeObserver(measure);
          ro.observe(el);
        }
      }
      if (!el) return setBox(undefined);
      const r = el.getBoundingClientRect();
      const next = { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) };
      setBox((b) => (b && b.left === next.left && b.top === next.top && b.right === next.right && b.bottom === next.bottom ? b : next));
    };
    measure();
    const mo = new MutationObserver(measure);
    mo.observe(document.body, { childList: true });
    window.addEventListener("resize", measure);
    return () => {
      mo.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return box;
}
