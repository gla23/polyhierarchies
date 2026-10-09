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
```

`extensions/tree-view-table-layout` began as Directus Labs' layout. Its table now lives in
`packages/ui/src/table/`, shared with the playground's Tree table, and draws *placements* rather
than items: one row per route to a node, so the same table shows a taxonomy (one parent each) and a
polyhierarchy. The extension keeps what only Directus has: the query, the options panel, the item
page, saving. It declares `@directus/composables` and `@directus/system-data`, which labs only got
transitively: Bun's isolated installs don't expose undeclared packages, and a package left external
breaks at runtime, as Directus doesn't share them with extensions. If a build warns that an
`@directus/…` import "could not be resolved", declare that one too.
