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
