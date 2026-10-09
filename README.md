# Polyhierarchies

Ways of showing data where an item can have more than one parent — a tomato under both _Fruit_
and _Vegetable_ — tried out side by side on the same datasets.

Exploring happens in the **playground**: pick a dataset, pick a UI, read why it behaves the way it
does. Swapping either is one click, which is the point — as Directus extensions every experiment
would mean reconfiguring a collection's layout. Once a UI is worth keeping, its component is
already the one the **extensions** package up for Directus.

```
packages/
  core/        Framework-free: the polyhierarchy model, graph queries, and the in-memory datasets
  ui/          Vue components, styled with Directus's theme variables (theme.css supplies them
               standalone, so a component looks the same in the playground and in the admin).
               src/table/ is the tree table the Directus layout and the playground both draw,
               imported by the extension as @polyhierarchies/ui/table
  playground/  Vite + Vue app for prototyping, explaining and demoing each UI
extensions/
  tree-view-table-layout/   The Directus tree view layout, grown from Directus Labs' own
```

## The model

A polyhierarchy is nodes plus **parent → child edges** that may give a node several parents, and
optional **jumps**: undirected "related to" links outside the hierarchy (TheBrain's third link
type). **Siblings are never stored** — they're derived as the other children of a node's parents,
grouped by which parent they share.

**Cycles are allowed**, and every UI has to cope with them. All parents are equal. A tree-shaped
UI draws a node in full the first time it renders it and as a terminal duplicate every time after,
which is also what stops a cycle recursing forever. "First" is the graph's **spanning tree**: the
parent a depth-first walk from the roots first reaches each node through. A stored primary parent
is a different model, explored on the playground's _Primary parents?_ page rather than assumed.

## Commands

```bash
bun install
bun run dev        # the playground
bun run build      # every package and extension
bun run test       # the model, the tree rule and the sort planner, from each package's test/
```

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
