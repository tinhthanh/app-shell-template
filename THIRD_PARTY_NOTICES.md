# Third-party notices

This template is extracted from the desktop app of
[Shipyard](https://github.com/cosscom/shipyard) (MIT, © 2026 Sean Brydon):
its UI kit, themes, settings scaffolding, focus handling, sidebar and
checks, with the product-specific parts removed. Later changes ported
from it name it where they land: the type scale (`src/index.css`,
`scripts/check-type.mjs`) the sidebar's ink (`src/components/ink.ts`), the layout grid
(`src/index.css`, `scripts/check-grid.mjs`) and Settings as a page of
its own with Find a setting (`src/views/settings/`). Code derived from other
projects, with their notices:

## What the build bundles

`pnpm build` writes `dist/third-party-licenses.md` with the licence of every
package in the bundle (React, Base UI, lucide, class-variance-authority,
clsx, tailwind-merge, zustand and their dependencies). Ship it beside the
app.

## Fonts

| Font | Source | Licence |
|---|---|---|
| Inter | [rsms/inter](https://github.com/rsms/inter), via `@fontsource-variable/inter` | SIL Open Font License 1.1, Copyright 2016 The Inter Project Authors |
| JetBrains Mono | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono), via `@fontsource-variable/jetbrains-mono` | SIL Open Font License 1.1, Copyright 2020 The JetBrains Mono Project Authors |

The fonts ship as `woff2` files in `dist/assets`; the OFL asks that this
notice travel with them.

## coss ui

The components in `src/components/ui/` were installed from the
[coss ui](https://coss.com/ui) registry (`components.json`) and edited in
place, the shadcn way. They are built on [Base UI](https://base-ui.com)
(MIT, © MUI).

## Beautiful UI

| Used here | Source | Author | Licence |
|---|---|---|---|
| The pixel-grid loader (`src/components/pixel-loader.tsx`, `pixel-loader.css`): the 3×3 grid, its chevron delays and timing | Loading State, [beautifului.dev](https://www.beautifului.dev/) ([licence](https://www.beautifului.dev/license)) | Copyright (c) 2026 Shane Levine | MIT |

Only the grid's design and timing come from Beautiful UI; the code is
written for this app's tokens and motion rules.

## Editor themes

`src/themes/vscode.ts` ports these VS Code themes. Each was mapped onto the
app's colour tokens from the theme's own palette (its VS Code colours and
terminal ANSI 16, as published in its repository and copied into
[`@shikijs/themes`](https://github.com/shikijs/textmate-grammars-themes)).
Where a colour fell short of the contrast the app keeps (body and muted
text at 4.5:1, see `src/themes/contrast.ts`), it was moved in lightness
only; `vscode.ts` notes each such change.

All are under the MIT licence. Their copyright notices:

| Theme | Source | Author | Licence |
|---|---|---|---|
| Dracula | [dracula/visual-studio-code](https://github.com/dracula/visual-studio-code) | Copyright (c) 2016 Dracula Theme | MIT |
| One Dark Pro | [Binaryify/OneDark-Pro](https://github.com/Binaryify/OneDark-Pro) | Copyright (c) 2013-2022 Binaryify | MIT |
| One Light | [akamud/vscode-theme-onelight](https://github.com/akamud/vscode-theme-onelight) | Copyright (c) 2015 Mahmoud Ali | MIT |
| Catppuccin Mocha, Catppuccin Latte | [catppuccin/vscode](https://github.com/catppuccin/vscode) | Copyright (c) 2021 Catppuccin | MIT |
| Tokyo Night | [enkia/tokyo-night-vscode-theme](https://github.com/enkia/tokyo-night-vscode-theme) | Copyright (c) 2018-present Enkia | MIT |
| Nord | [nordtheme/visual-studio-code](https://github.com/nordtheme/visual-studio-code) | Copyright (c) 2016-present Sven Greb | MIT |
| GitHub Dark, GitHub Dark Dimmed, GitHub Light | [primer/github-vscode-theme](https://github.com/primer/github-vscode-theme) | Copyright (c) 2020 Primer | MIT |
| Gruvbox Dark, Gruvbox Light | [jdinhify/vscode-theme-gruvbox](https://github.com/jdinhify/vscode-theme-gruvbox) | Copyright © 2017 JD | MIT |
| Solarized Dark, Solarized Light | [microsoft/vscode](https://github.com/microsoft/vscode) (extensions/theme-solarized-*), after [altercation/solarized](https://github.com/altercation/solarized) | Copyright (c) 2015 - present Microsoft Corporation; Copyright (c) 2011 Ethan Schoonover | MIT |
| Rosé Pine, Rosé Pine Dawn | [rose-pine/vscode](https://github.com/rose-pine/vscode) | Copyright (c) 2021 Rosé Pine | MIT |
| Night Owl, Night Owl Light | [sdras/night-owl-vscode-theme](https://github.com/sdras/night-owl-vscode-theme) | Copyright (c) 2018 Sarah Drasner | MIT |
| Kanagawa Wave | [metapho-re/kanagawa-vscode-theme](https://github.com/metapho-re/kanagawa-vscode-theme), after [rebelot/kanagawa.nvim](https://github.com/rebelot/kanagawa.nvim) | Copyright (c) 2025 Pierre-Alain Castella; Copyright (c) 2021 Tommaso Laurenzi | MIT |

The MIT licence, as each of the above grants it:

> Permission is hereby granted, free of charge, to any person obtaining a
> copy of this software and associated documentation files (the
> "Software"), to deal in the Software without restriction, including
> without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, and to permit
> persons to whom the Software is furnished to do so, subject to the
> following conditions:
>
> The above copyright notice and this permission notice shall be included
> in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
> OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
> MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
> NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
> OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
> USE OR OTHER DEALINGS IN THE SOFTWARE.
