// The app's frame: the sidebar, the status bar, the palette, the places and the window's titles.
// English is the source; vi has a line for every key in it (lib/i18n.ts).

export const en = {
  "shell.language": "Language",
} as const;

export const vi: Record<keyof typeof en, string> = {
  "shell.language": "Ngôn ngữ",
};
