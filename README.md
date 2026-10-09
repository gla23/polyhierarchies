# Polyhierarchies

Ways of showing data where an item can have more than one parent — a tomato under both _Fruit_
and _Vegetable_ — and a Directus layout that can edit one.

This repo is two things:

## a) Research and UI examples

**[gla23.github.io/polyhierarchies](https://gla23.github.io/polyhierarchies/)** — an interactive
playground. Pick a dataset (food, animals, medicine, a food web, a generated one big enough to
test performance), pick a UI, and read why it behaves the way it does. Swapping either keeps your place.

- **Eight UIs on the same data**: a tree table, a tree lab without Directus's limits, Miller
  columns, a TheBrain-style plex, a layered DAG, force-directed and network graphs, and faceted
  browsing. Each can view or edit.
- **Concept pages** on the problems every polyhierarchy UI has to answer: placements, cycles,
  siblings, looking up, every path to a node, selection, searching, primary parents, and trees too
  big to load.
- **Prior art**: how TheBrain, Wikipedia, TiddlyWiki, Obsidian, MeSH, SNOMED, ICD-11, QuickGO,
  OLS, Graphviz and d3-dag show the same thing, with screenshots.

## b) A Directus layout for both kinds of hierarchy

`extensions/tree-view-table-layout` is a tree table layout for Directus that handles a
**taxonomy** (one parent each, through a many-to-one field) and a **polyhierarchy** (any number of
parents, through a links collection). It began as Directus Labs'
[Tree View Table Layout](https://github.com/directus-labs/extensions/tree/main/packages/tree-view-table-layout)
and has since been rebuilt almost throughout:

**Polyhierarchies**
- Any number of parents per item, kept in a junction collection that the options find for you from
  the schema (and guess which end is the parent).
- One row per route to an item: drawn in full the first time, then as a dimmed duplicate saying
  where it lives ("in Fruit"), which takes you there. Cycles are fine.
- A different place under each parent, from an integer sort on the links.
- Swap parent and child to see the hierarchy upside down: everything an item belongs to rather than
  what it contains.
- Hold ⌥/Alt as you drop to add a parent rather than move; add parents or children, or unlink from
  the parent it's under, from a selected row's actions.

**Taxonomies**
- Works without a sort field: it nests, it just can't be dragged, and a row can still be
  reparented from its actions.
- Sorting by a column keeps the tree, with each parent's children in that order.

**Folding**
- Chevrons are real buttons, merged with the drag handles to cut clutter.
- ⌘/Ctrl-click to fold or unfold everything inside, ⌥/Alt-click to include its siblings; Unfold
  all.
- How many levels start open, and a cap on how deep Unfold all and searches go, so the columns stay
  on screen.
- Folds are remembered in the browser's local storage per collection instead of being written to
  the shared view, with a button to reset them.
- Optional guide lines down each open item.

**Reading the tree**
- Choose which column indents; the columns after it stay in line.
- Hints in the row: how much a fold holds ("12 below"), where a duplicate lives. Clicking one opens
  the way there, scrolls to it and pulses it.
- The item count says how many it starts from and how many match.

**Search and filters**
- A search either shows every route to its matches, or keeps your folds and marks the matches
  where they are. Enter goes to the next match.
- Filters can do either, hide what doesn't match, or be switched off without being cleared, from a
  menu in the top bar.
- The tree can still be edited while searching.

**Keyboard and clicking**
- The arrow keys walk the rows, → and ← open and fold or step in and out, Enter opens, Esc goes
  from the search into the table.
- A click can open a row, as Directus does, or select it, with a double-click to open; ⌥/Alt-click
  selects either way.
- Works as an item picker in Directus's drawers: the search is ready to type into, ⌘Enter ticks
  the selected row.
- Every control is a real `<button>`, so keyboard-hint extensions like Vimium reach them.

**Animation**
- Folds open and close smoothly; rows a drag pushes aside slide out of the way; new items grow in.
- Animation switches itself off while there are too many rows to keep it smooth.

**Performance**
- The whole tree loads at once, without pages.
- Rows far off screen keep their height but skip their cells, and beyond 300 rows only the ones
  showing are drawn.
- Rows don't redraw when nothing about them changed, even while Directus redraws the layout around
  them as its sidebar moves — tuned especially for Firefox.

**Doesn't crash, doesn't lose work**
- Saves queue behind each other, so quick successive drags don't fight or snap back on reload.
- Moves are planned from fresh sort values, and a tested planner renumbers only what it must.
- A Firefox response without data, which Directus leaves as undefined items, shows as no items
  rather than an error.
- No "Unexpected error" in item pickers from translations read in the wrong place.
- Respects the links collection's permissions, and says so when the links can't be read rather
  than drawing every item at the top level.

The table itself lives in `packages/ui/src/table/` and is the same one the playground's Tree table
draws, so what you try in the playground is what runs in Directus. In the layout's options, _What
this layout can do_ links to the playground.

To install it, build it (`bun run build`) and copy `extensions/tree-view-table-layout` (its
`package.json` and `dist/`) into your Directus `extensions` folder, then pick **Polyhierarchies**
as a collection's layout.

## Layout

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
