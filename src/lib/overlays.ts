// OVERLAYS matches what holds the keyboard over the page: open dialogs,
// menus, listboxes and popovers. focusHome (lib/focus-home.ts) leaves the
// keyboard where it is while one is open, rather than sending it to the main
// area. Toasts are role=dialog too, but never hold the keyboard, so a toast
// that stays on screen must not stop the keyboard going home.
export const OVERLAYS =
  "[role=dialog]:not([data-slot^=toast-viewport] *), [role=alertdialog]:not([data-slot^=toast-viewport] *), [role=menu], [role=listbox], [data-slot=popover-popup], [data-app-overlay]";
