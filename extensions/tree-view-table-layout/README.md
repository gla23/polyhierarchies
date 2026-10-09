# Polyhierarchies layout for Directus

A tree table layout for both a **taxonomy** (one parent each, through a many-to-one field) and a
**polyhierarchy** (any number of parents, through a links collection). Grown from Directus Labs'
[Tree View Table Layout](https://github.com/directus-labs/extensions/tree/main/packages/tree-view-table-layout).

What it can do, and why, is in the [repo's README](../../README.md) and, with live examples, at
[gla23.github.io/polyhierarchies](https://gla23.github.io/polyhierarchies/).

## Installation

Build it from the repo root with `bun run build`, then copy this folder's `package.json` and
`dist/` into your Directus `extensions` folder. On a collection's page, choose **Polyhierarchies**
from the layout drop-down, then set the hierarchy up in the layout options:

- **Taxonomy**: choose a many-to-one field that points at the same collection. With the
  collection's sort field set too, rows can be dragged into place.
- **Polyhierarchy**: choose a links collection, one with two many-to-one fields pointing at this
  collection (a many-to-many from the collection to itself makes one). An integer field on the
  links lets each item have its own place under each parent.

Moves are saved as updates to the sort, parent or links fields, so a hook or flow can listen for
those.
