// Every area's words in one table per language (lib/i18n.ts). A new area
// is a file beside this one, spread into both.
import * as common from "./common.ts";
import * as projects from "./projects.ts";
import * as settings from "./settings.ts";
import * as shell from "./shell.ts";
import * as signin from "./signin.ts";
import * as tasks from "./tasks.ts";

export const en = { ...shell.en, ...common.en, ...projects.en, ...settings.en, ...signin.en, ...tasks.en };
export type Key = keyof typeof en;
export const vi: Record<Key, string> = { ...shell.vi, ...common.vi, ...projects.vi, ...settings.vi, ...signin.vi, ...tasks.vi };
