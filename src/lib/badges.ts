import { create } from "zustand";

import { onSignedOut } from "./session.ts";

// A place's count in the sidebar ("Projects 8", "Review 2"): any view or
// background job sets it by the place's id, and the sidebar draws it beside
// the place on the rail (components/sidebar-rail.tsx; a dot, or a number when loud). loud marks a count that
// wants the person (something waits on them). After Shipyard's sidebar
// (github.com/cosscom/shipyard, MIT). Pure, so badges.test.ts runs it in node.

export interface Badge {
  count: number;
  loud?: boolean;
}

export const usePlaceBadges = create<Record<string, Badge>>()(() => ({}));

// The next person to sign in starts with no counts.
onSignedOut(() => usePlaceBadges.setState({}, true));

// setPlaceBadge shows a count on a place, or takes it away (0 or undefined).
export function setPlaceBadge(placeId: string, count: number | undefined, loud = false) {
  usePlaceBadges.setState((s) => {
    const next = { ...s };
    if (count && count > 0) next[placeId] = { count, loud };
    else delete next[placeId];
    return next;
  }, true);
}
