This repo is two things:

- A playground showing [Research and UI examples](gla23.github.io/polyhierarchies) for exploring the two types of hierarchy: **taxonomy** (one parent each, through a many-to-one field) and **polyhierarchy** (any number of
parents, through a links collection)
- A Directus extension that upgrades Directus Labs'
[Tree View Table Layout](https://github.com/directus-labs/extensions/tree/main/packages/tree-view-table-layout) to handle both of these magical entities


# What upgrades?

For those who have used the above extension and are aware of how annoying it is, here is a feature list to whet your appetite...

**Polyhierarchies**
- Automatically find the likely related junction and FKs (just works)
- Ability to swap the junction direction round to reverse the polyhierarchy
- Handles cycles with links

**Taxonomies**
- Sorting by a column keeps the tree, with each parent's children in that order.
- Works without a sort field as well. a row can still be reparented just not sorted in the sibline list 👍

**Folding**
- Chevrons are merged with the drag handles to cut clutter 🔥
- ⌘/Ctrl-click to fold or unfold everything inside, ⌥/Alt-click to include its siblings; Unfold
  all.
- A setting for how many levels start open, and a cap on how deep Unfold all and searches go so the columns stay
  on screen.
- Folds are remembered in the browser's local storage per collection instead of being written to
  the shared view, with a button to reset them 🔥
- Optional guide lines down each open item 👍

**Reading the tree**
- Choose which column indents; the columns after it stay in line 🔥🔥 You can see the hierarchy with the relevant data but later rows stay in line.
- Hints in the row: how much a fold holds ("12 below"), where a duplicate lives. Clicking one opens
  the way there, scrolls to it and pulses it.
- The item count says how many it starts from and how many match.

**Search and filters**
- Search actually works! You can search and it finds stuff wherever they are. There are different search modes.
- The filters can hide things from the tree altogether while everything else all works 🔥🔥
- The search term is stripped when opening the layout in a drawer so you don't have to clear it when selecting that item if you forgot to clear your search...
- Search box autofocuses finally
- Shortcut for quick selection while searching
- Did I mention the tree still works while searching

**Animation and performance**
- Yes and yes
- Virualisation and animation switches itself off while there are too many rows to keep it smooth 🔥
