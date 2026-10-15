import { useEffect } from "react";
import { create } from "zustand";

// The record in front, for the window's title ("Shop — Projects — App"):
// a detail view says its name with useTitle, and hooks/use-window-title.ts
// puts it first. Cleared when the view unmounts.

export const useTitleDetail = create<{ detail?: string }>()(() => ({}));

export function useTitle(detail?: string) {
  useEffect(() => {
    useTitleDetail.setState({ detail });
    return () => useTitleDetail.setState({ detail: undefined });
  }, [detail]);
}
