# CLAUDE.md

Read README.md for the layout and the model. British spelling.

- **Components style themselves only with Directus's `--theme--*` variables.** In the admin they
  already exist; standalone, `packages/ui/src/theme.css` supplies them. Never import theme.css from
  an extension, and never hard-code a colour in a component.
- **The graph is read through `createGraph`** (`packages/core/src/graph.ts`), never by walking
  `edges` directly, so every UI agrees on what a parent, child, jump and sibling are.
- **Every UI takes the same props**: `graph`, `v-model:focus`, an optional `editor` (a
  `GraphEditor`; none means read only) and `density`, plus its own options, declared with their
  explanations in `packages/playground/src/uis.ts`. That's what lets the playground swap UIs while
  keeping your place.
- **Edits are pure functions** in `packages/core/src/edit.ts`, returning a new dataset. A UI only
  decides which gesture calls which `GraphEditor` method; the playground saves the result.
- **Tree-shaped UIs share `useTree`** (`packages/ui/src/tree.ts`) for which placement is full,
  which are duplicates and loops, and fold state — so the rule can't drift between them. The
  shared tree table draws from `placementTree()` in the same file.
- **The tree table in `packages/ui/src/table/` is the Directus layout's own**, used by both the
  extension and the playground. It takes Directus's components (checkbox, icon, menu, tooltip,
  translations) from an injected `TableKit` and never uses Directus globals directly: the extension
  provides Directus's, the playground the look-alikes in `packages/ui/src/kit/`.
- Datasets are written as indented outlines (see `packages/core/src/outline.ts`) so they read like
  the hierarchy they describe, with icons, colours and column values in a separate `details` map.
- Controls are real `<button>`s so keyboard-hint extensions (Vimium) can reach them.
- Framerate over decoration, especially in Gecko: no `backdrop-filter`, big blur radii,
  `mix-blend-mode` or `transition: all`. Transition `transform`/`opacity` only.
- Don't over-comment: explain the surprising why, not what the code already says.


## Commands

```bash
bun install
bun run dev        # the playground
bun run build      # every package and extension
bun run test       # the model, the tree rule and the sort planner, from each package's test/
```

The playground is published to GitHub Pages by `.github/workflows/pages.yml` on every push to
`master`, once Pages is set to deploy from GitHub Actions in the repo's settings.

## Technical notes

`extensions/tree-view-table-layout` began as Directus Labs' layout. Its table now lives in
`packages/ui/src/table/`, shared with the playground's Tree table, and draws *placements* rather
than items: one row per route to a node, so the same table shows a taxonomy (one parent each) and a
polyhierarchy. The extension keeps what only Directus has: the query, the options panel, the item
page, saving. It declares `@directus/composables` and `@directus/system-data`, which labs only got
transitively: Bun's isolated installs don't expose undeclared packages, and a package left external
breaks at runtime, as Directus doesn't share them with extensions. If a build warns that an
`@directus/…` import "could not be resolved", declare that one too.

A few traps found the hard way, each also commented where it bit:

- **No `v-bind()` in the CSS of a component drawn once per row.** Vue sets those variables with a
  query over the whole page every time the component redraws, so a few hundred rows redrawn at once
  cost hundreds of whole-page queries. Set the variables once on a parent instead, as the table does
  for row heights.
- **Rows take the table's slots as one prop, not as slots.** Handed on as slots they'd be forwarded
  slots, and Vue redraws everything holding forwarded slots whenever anything above it redraws;
  Directus redraws a layout several times as its sidebar opens. Fresh objects, functions and
  undeclared listeners passed to each row cause the same redraws, so the table reuses them while
  they're unchanged.
- **No `useI18n()` inside a computed.** Vue 3.5 re-checks a computed outside any component to see
  whether it changed, where `useI18n()` throws. In the page that only stops the computed updating;
  inside an item picker, Directus's error boundary swaps the whole field for "Unexpected error".
  Take `t` and `n` in setup and pass them in.
- **Directus restyles the whole page whenever its sidebar moves**: the split panel keeps its sizes
  in a CSS variable on the element around everything, so every descendant restyles. That's why rows
  far off screen are drawn without their cells: `content-visibility` would keep them findable, but
  Gecko restyles what it skips.
- **A Directus layout's wrapper is `display: contents`**, which can't take focus, so the table
  focuses its `<table>` for the keyboard. Directus's menus are too, which takes no opacity, so a
  dimmed row dims what's inside a display's menu instead.
- **A row moved in the page is new to the browser.** Vue moves a row by taking it out and putting it
  back, which replays `@starting-style`, so mid-drag every moved row grew from nothing again. Only
  rows for items new to the page grow in. The rows a drag pushes aside slide instead, and can't be
  hovered on the way: one passing under a pointer held still would be taken for a place to drop.
- **Firefox sometimes gets a Directus response without data**, after which Directus leaves its
  items undefined (and logs its own TypeError from `useItems().getTotalCount`). The layout treats
  missing items as none.
