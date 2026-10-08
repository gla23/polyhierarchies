import {
	FacetedView,
	ForceGraph,
	LayeredDag,
	MillerColumns,
	NetworkGraph,
	OutlineTree,
	Plex,
	TreeTable
} from '@polyhierarchies/ui';
import type { Component } from 'vue';

export interface OptionDef {
	key: string;
	label: string;
	about: string;
	type: 'number' | 'choice';
	default: number | string;
	min?: number;
	max?: number;
	choices?: { value: string; label: string }[];
}

export interface UiEntry {
	id: string;
	name: string;
	/** Every UI takes `graph`, `v-model:focus`, an optional `editor` and its options as props */
	component: Component;
	about: string[];
	/** How it's edited, when editing is on */
	editing: string;
	options: OptionDef[];
}

const density: OptionDef = {
	key: 'density',
	label: 'Density',
	type: 'choice',
	default: 'cosy',
	choices: [
		{ value: 'compact', label: 'Compact' },
		{ value: 'cosy', label: 'Cosy' },
		{ value: 'comfortable', label: 'Comfortable' }
	],
	about: "Directus's three row sizes. Every UI spaces its nodes and rows from the same setting."
};

const repeat: OptionDef = {
	key: 'repeat',
	label: 'Other placements',
	type: 'choice',
	default: 'once',
	choices: [
		{ value: 'once', label: 'Terminal duplicates' },
		{ value: 'mirror', label: 'Mirrors' }
	],
	about:
		"Terminal duplicates draw a node in full once and point there from everywhere else, as ontology browsers mark repeated entries. Mirrors draw it in full everywhere, live copies as in Workflowy, so its children turn up under every parent (⇄ marks one) — until a node would repeat inside its own path, where it stops as a loop."
};

const motion: OptionDef = {
	key: 'motion',
	label: 'Animation',
	type: 'choice',
	default: 'auto',
	choices: [
		{ value: 'auto', label: 'Auto' },
		{ value: 'on', label: 'On' },
		{ value: 'off', label: 'Off' }
	],
	about:
		'Auto animates until there are too many things moving to stay smooth — a few hundred rows, a crowded plex, a big graph — then just swaps. On forces it, to see the cost; off stops it.'
};

export const uis: UiEntry[] = [
	{
		id: 'outline',
		name: 'Outline',
		component: OutlineTree,
		about: [
			'The simplest tree: one line per placement, nothing but the hierarchy. It renders every placement, but checks whether it has already drawn a node: the first time it\'s drawn in full, and every time after as a dashed, terminal duplicate that jumps to the full one.',
			'That same rule is what stops a cycle recursing forever: the second time round, a node is a duplicate — and when the duplicate is one of its own ancestors, it gets a ↻ in the warning colour, as that is where a loop closes. The number beside a node counts its parents; hover it and every placement lights up. Hold Alt and everything the focus lives in lights up instead — Zotero\'s trick.'
		],
		editing:
			'Drag a row by its handle: onto the top or bottom of another to move beside it, onto its middle to move inside. Hold Alt to add a parent instead of moving. Hover a row for + (add a child), ✎ (edit) and × (remove it from this parent — a node under several keeps the others). Double-click to edit.',
		options: [
			density,
			motion,
			repeat,
			{
				key: 'indent',
				label: 'Indent (px)',
				type: 'number',
				default: 24,
				min: 8,
				max: 64,
				about: 'How far each level steps in.'
			}
		]
	},
	{
		id: 'tree-table',
		name: 'Tree table',
		component: TreeTable,
		about: [
			"The Directus tree-view layout's shape: a table whose rows nest, with columns you can resize and drag into another order, selection and drag handles. Same placement rule as the Outline, so duplicates and loops read the same.",
			'The first columns can follow the hierarchy: they move right with each level, and the last of them gives up the same width, so every column after it stays in one straight line. That is what makes a deep tree with a title column readable without everything else zig-zagging. Hold Alt to light up every parent of the focus.'
		],
		editing:
			'Click a row to open it, as Directus opens the item page. Drag handles move a row (top or bottom edge: beside, middle: inside; Alt adds a parent instead). + New adds a node under the focus.',
		options: [
			density,
			motion,
			repeat,
			{
				key: 'shiftedColumns',
				label: 'Columns that follow the hierarchy',
				type: 'number',
				default: 1,
				min: 0,
				max: 4,
				about:
					"How many columns, from the first, move with each level. The last of them shortens by the indent, so the columns after it stay aligned. 0 is Directus's own behaviour: only the controls indent."
			},
			{
				key: 'indent',
				label: 'Indent (px)',
				type: 'number',
				default: 28,
				min: 8,
				max: 64,
				about: 'How far each level steps in. 28 is what Directus uses.'
			},
			{
				key: 'guides',
				label: 'Lines down each open item',
				type: 'choice',
				default: 'shown',
				choices: [
					{ value: 'shown', label: 'Shown' },
					{ value: 'hidden', label: 'Hidden' }
				],
				about:
					"A faint line from under an open item's chevron down everything inside it, wrapping round the last row, so it's clear where each item's contents end. Folds with the rows."
			},
			{
				key: 'handle',
				label: 'Chevron and drag handle',
				type: 'choice',
				default: 'merged',
				choices: [
					{ value: 'separate', label: 'Separate' },
					{ value: 'merged', label: 'Merged' }
				],
				about:
					"Separate is Directus's: a chevron to fold, then a handle to drag. Merged makes them one control, as a folder in VS Code or Finder opens on a click and moves on a drag: a folder's chevron folds when clicked and moves when dragged, and a leaf, with nothing to fold, shows the handle. One icon fewer on every row, and each row's first mark sits at its own level. While editing only: read only, there's nothing to drag."
			}
		]
	},
	{
		id: 'miller',
		name: 'Miller columns',
		component: MillerColumns,
		about: [
			"Finder's column view: pick a node and its children open in the next column, so the columns are one route down from a root. In a tree that's all there is; here the last column says which parent this route came through, and lists the others.",
			'Clicking one of those re-routes the columns through it, which walks you round each of a node\'s homes in turn — the polyhierarchy felt rather than drawn. A column holds every child whatever else it belongs to, so nothing is ever a duplicate, and a cycle just lets you keep going round. Hold Alt to light up the focus\'s parents in whichever columns show them.'
		],
		editing:
			'+ Add here at the foot of a column adds a node under that column\'s parent. Double-click a node, or Edit in the last column, to open it.',
		options: [density, motion]
	},
	{
		id: 'plex',
		name: 'Plex',
		component: Plex,
		about: [
			"TheBrain's layout, which it calls the plex. Parents above, children below, jumps (non-hierarchical links) to the left, and siblings to the right, grouped by the parent they share. Siblings aren't stored anywhere: they're the other children of your parents, which is why hovering one lights up the line from a parent rather than from the focus.",
			'All parents are equal and nothing is ever a duplicate, because only one step out is shown. Levels further out are added while they fit — grandparents appear when there are few enough of them, which TheBrain only offers as a manual "expanded" mode.'
		],
		editing:
			'Under the focus: + Parent, + Child and + Jump each make a new node already linked that way and open it to be named. Edit (or double-click the focus) opens it; relationships are added and removed there.',
		options: [
			density,
			motion,
			{
				key: 'budget',
				label: 'Node budget',
				type: 'number',
				default: 16,
				min: 1,
				max: 80,
				about:
					'How many nodes each direction may show across its levels before it stops adding more. Low shows one level; high reaches further up and down.'
			}
		]
	},
	{
		id: 'layered',
		name: 'Layered DAG',
		component: LayeredDag,
		about: [
			"A Sugiyama layout, the one Graphviz and d3-dag draw: every node in the layer below its deepest parent, so each child sits under all of its parents, with the order within layers chosen to cut crossings. Every node once, like the force graph, but it reads top to bottom like a tree.",
			'Cycles are broken at the edges that close them, which loop round the right-hand side in the warning colour. On a big graph it shows only the focus with everything above and below it, re-laid out as you move — which is when the nodes glide.'
		],
		editing:
			'Click to focus, double-click to open. + New adds a node under the focus; relationships are edited in the node.',
		options: [
			density,
			{
				...motion,
				about:
					'Auto glides nodes to their new layers when the focus moves, up to 150 of them. Only with the focus-only scope, as the whole graph doesn\'t re-lay out on focus.'
			},
			{
				key: 'scope',
				label: 'Scope',
				type: 'choice',
				default: 'auto',
				choices: [
					{ value: 'auto', label: 'Auto' },
					{ value: 'all', label: 'Whole graph' },
					{ value: 'focus', label: 'Around the focus' },
					{ value: 'ancestors', label: 'Ancestors only' }
				],
				about:
					"The whole graph, the focus with what's above and below it, or only what's above it: QuickGO's ancestor chart, every path up to the roots at once. Auto shows it all up to 150 nodes."
			}
		]
	},
	{
		id: 'force',
		name: 'Force graph',
		component: ForceGraph,
		about: [
			"Ported from the force-directed Directus layout. Every node once, every edge drawn, so several parents and cycles are simply more lines. Each parent's links share a colour, so a node's parents read apart.",
			'Nodes are pulled into layers by depth, their shortest distance from a root, so parents mostly sit above their children. Arrows point from parent to child, and the edge that closes each cycle is drawn in the warning colour; jumps are dashed and have no direction. The whole graph at once is its strength and, past a few hundred nodes, its weakness — click a node to fade everything but its neighbours.'
		],
		editing:
			'Double-click empty space to add a node there; double-click a node to edit it. Shift-drag from one node to another to make the first a parent of the second. Click a line to remove it.',
		options: [
			{
				...density,
				about: 'Here it sets the gap between layers, the graph’s equivalent of row height.'
			},
			{
				...motion,
				about:
					'Auto lets the layout settle live up to 500 nodes; past that it settles before drawing and then holds still, as repainting every line each frame would stutter.'
			}
		]
	},
	{
		id: 'network',
		name: 'Network graph',
		component: NetworkGraph,
		about: [
			"Obsidian's graph view. The same simulation as the force graph with the hierarchy taken out: no layers, no arrows, parents and children and jumps all just links, so nodes settle wherever their connections pull them. What it shows is clusters — which nodes live close together — rather than what's above what.",
			"Each dot is sized by how many links it has, so hubs stand out, and names fade in as you zoom, so the whole graph reads as a shape before it reads as words. Hover a node to light it and its neighbours. The local scope is Obsidian's local graph: the focus and whatever is within a few links of it, re-drawn as the focus moves."
		],
		editing:
			'Double-click empty space to add a node there; double-click a node to edit it. Shift-drag from one node to another to make the first a parent of the second.',
		options: [
			{
				...density,
				about: 'Here it sets how long the links are, so how spread out the graph is.'
			},
			{
				...motion,
				about:
					'Auto lets the layout settle live up to 500 nodes; past that it settles before drawing and then holds still.'
			},
			{
				key: 'scope',
				label: 'Scope',
				type: 'choice',
				default: 'all',
				choices: [
					{ value: 'all', label: 'Whole graph' },
					{ value: 'local', label: 'Around the focus' }
				],
				about:
					"Obsidian's two graphs: the global one, everything at once, or the local one, only what's within the depth below of the focus."
			},
			{
				key: 'depth',
				label: 'Local depth',
				type: 'number',
				default: 2,
				min: 1,
				max: 5,
				about: 'How many links out from the focus the local scope reaches, in any direction.'
			}
		]
	},
	{
		id: 'faceted',
		name: 'Faceted',
		component: FacetedView,
		about: [
			"Parents as filters instead of places. Tick Fruit and Salad and you're left with what's under both: tomato, cucumber, avocado and olive. It's how several parents actually get used — to narrow down — and why a shop files a product in many categories rather than one.",
			'Each count says how many results would be left if that facet were ticked too, so dead ends never show. In a tree, every intersection is empty: a thing has only one parent to match.'
		],
		editing:
			'+ New makes a node with every ticked facet as a parent at once — the one place a node is born into several. Double-click a result to open it.',
		options: [
			density,
			motion,
			{
				key: 'reach',
				label: 'A facet holds',
				type: 'choice',
				default: 'descendants',
				choices: [
					{ value: 'descendants', label: 'Everything below it' },
					{ value: 'children', label: 'Its children only' }
				],
				about:
					'Everything below a facet, as a search would mean it (a viral pneumonia is an infectious disease however many levels down), or only what sits directly under it.'
			}
		]
	}
];
