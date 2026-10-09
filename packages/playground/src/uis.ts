import {
	FacetedView,
	ForceGraph,
	LayeredDag,
	MillerColumns,
	NetworkGraph,
	Plex,
	TreeLab,
	TreeTable
} from '@polyhierarchies/ui';
import type { Component } from 'vue';
import type { ConceptId } from './pages/concepts';

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
	/** The concept pages it's an example in */
	concepts?: ConceptId[];
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
		id: 'tree-table',
		concepts: ['placements', 'cycles', 'searching', 'selection', 'too-big'],
		name: 'Tree table',
		component: TreeTable,
		about: [
			"The Directus tree view layout itself: the same component the extension draws in the admin, given this dataset instead of a collection. Only a checkbox, an icon, a menu and a tooltip are stand-ins here; the rest is the extension's own markup and styles, so what you see is what Directus shows.",
			'It draws placements rather than items: a node with two parents is two rows, in full where it is first reached and a dimmed duplicate everywhere else, which is what lets one table show a taxonomy (one parent each) and a polyhierarchy alike. One column is the tree column, usually the name: it and every column before it move right with each level while it gives up the same width, so every column after it stays in one straight line. It\'s chosen by column rather than counted, so it stays with the name however the columns are dragged about, and the hints go in it.',
			"Folding works as in the layout: ⌘/Ctrl-click a chevron for everything inside, ⌥/Alt-click for it and its siblings, and the folds you make are remembered in this browser. Searching keeps the tree, three ways (see While searching), the count says how many items it shows and how many of those match, Enter goes to the next match (opening the way to it), and rows can still be dragged. Hovering a row lights its other placements, and the hints act when clicked: \"12 below\" opens the branch, \"in Fruit\" goes to the full placement, \"above\" to the loop's ancestor; each says what it means on hover. What Directus can't do — parent counts, hover echoes, buttons on each row — is in the Tree lab."
		],
		editing:
			'Drag a row by its chevron or handle: up and down to reorder, right to put it inside the row above, left to take it out. Hold Alt as you drop to add a parent instead of moving it, as the Directus layout does in its polyhierarchy mode. Click a row to open it, as Directus opens the item page.',
		options: [
			{ ...density, default: 'compact', about: "Directus's three row sizes; compact by default, as in the layout, so more of a tree fits." },
			repeat,
			{
				key: 'treeColumn',
				label: 'Tree column',
				type: 'choice',
				default: 'label',
				choices: [
					{ value: 'label', label: 'Name' },
					{ value: 'controls', label: 'None: only the controls' }
				],
				about:
					"The column the hierarchy indents: it and every column before it move right with each level, and it gives up the same width so every column after it stays in one straight line. Chosen by column, not counted, so it stays with the name however the columns are reordered; hints like \"in Fruit\" and \"12 below\" go in it too, as it's the one with room. None is Directus's own behaviour: only the controls indent."
			},
			{
				key: 'searchMode',
				label: 'While searching',
				type: 'choice',
				default: 'routes',
				choices: [
					{ value: 'hide', label: 'Hide what doesn\'t match' },
					{ value: 'routes', label: 'Show the routes to the matches' },
					{ value: 'inplace', label: 'Keep my folds' }
				],
				about:
					'Hide: what doesn\'t match simply isn\'t there, nothing is highlighted and your folds stay; an ancestor stays, dimmed, only to hold a match\'s place. Routes: every way from a match up to the top is opened and the rest hidden, so you see where each match lives; folding then lasts only as long as the search. Keep my folds: nothing opens or hides, the matches are marked, and a folded row says how many it holds; click that to open the way to them. In Directus, filters and searches each have their own mode, so a filter can hide archived items while a search highlights on top. Whichever mode, you can keep editing.'
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
				key: 'openDepth',
				label: 'Levels open to start',
				type: 'choice',
				default: '2',
				choices: [
					{ value: '-1', label: 'All' },
					{ value: '0', label: 'Top level only' },
					{ value: '1', label: '1' },
					{ value: '2', label: '2' },
					{ value: '3', label: '3' },
					{ value: '4', label: '4' }
				],
				about:
					"How many levels start open, the layout's own option. Two by default: enough to see the shape without unfolding hundreds of rows. Folds you make yourself are kept on top of it."
			},
			{
				key: 'maxOpenDepth',
				label: 'Levels opened at most',
				type: 'choice',
				default: '5',
				choices: [
					{ value: '2', label: '2' },
					{ value: '3', label: '3' },
					{ value: '5', label: '5' },
					{ value: '8', label: '8' },
					{ value: '-1', label: 'No limit' }
				],
				about:
					"How deep Unfold all (the header's chevron) and a search's routes go, so a deep tree doesn't indent every column after the name off screen; a row at the limit says how many matches are below it. Opening one row, or going to one match with Enter, goes as deep as it needs, and ⌘/Ctrl-clicking a chevron opens everything inside."
			},
			{
				...motion,
				about:
					"Folding slides rows shut and open. Auto counts the rows drawn: in a big tree only the open ones are, so a huge tree with a few rows open still animates, and one with hundreds open just swaps. On forces it, to see the cost; off stops it."
			}
		]
	},
	{
		id: 'tree-lab',
		concepts: ['placements', 'looking-up', 'cycles', 'selection'],
		name: 'Tree lab',
		component: TreeLab,
		about: [
			"The Tree table without Directus's limits: what the tree view could be if it didn't have to fit Directus's columns and item pages. The same placement rule — a node in full the first time, then a dashed duplicate that says where the full one is (\"in Fruit\"), as ICD-11 greys an entry whose home is elsewhere, and a ↻ in the warning colour where a cycle closes.",
			"Free to add what Directus can't: the number beside a node counts its parents, and hovering it lights up every placement; hold Alt and everything the focus lives in lights up instead — Zotero's trick. A folded branch says how many distinct nodes are below it, as OLS does, so you know whether it's worth opening.",
			'Start from the focus zooms in on one node, as Workflowy does. With Direction set to Parents below, that is Wikipedia\'s parents mode: everything the node belongs to, as a tree.'
		],
		editing:
			'Drag a row by its handle: onto the top or bottom of another to move beside it, onto its middle to move inside. Hold Alt to add a parent instead of moving. Hover a row for + (add a child), ✎ (edit) and × (remove it from this parent — a node under several keeps the others). Double-click to edit.',
		options: [
			density,
			motion,
			repeat,
			{
				key: 'start',
				label: 'Start from',
				type: 'choice',
				default: 'roots',
				choices: [
					{ value: 'roots', label: 'The roots' },
					{ value: 'focus', label: 'The focus' }
				],
				about:
					'The roots, or zoomed in on one node: the focus at the moment you choose this, kept while you click around inside it (a button moves it to the new focus). With Direction set to Parents below, starting from a node shows everything it belongs to.'
			},
			{
				key: 'openDepth',
				label: 'Start open to',
				type: 'number',
				default: 0,
				min: 0,
				max: 8,
				about:
					"How many levels are open when a dataset loads, as the Directus layout's open depth does. 0 starts folded with just the way to the focus open."
			},
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
		id: 'miller',
		concepts: ['siblings', 'cycles'],
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
		concepts: ['siblings', 'looking-up'],
		name: 'Plex',
		component: Plex,
		about: [
			"TheBrain's layout, which it calls the plex. Parents above, children below, jumps (non-hierarchical links) to the left, and siblings to the right, grouped by the parent they share. Siblings aren't stored anywhere: they're the other children of your parents, which is why hovering one lights up the line from a parent rather than from the focus.",
			'All parents are equal and nothing is ever a duplicate, because only one step out is shown. Levels further out are added while they fit — grandparents appear when there are few enough of them, which TheBrain only offers as a manual "expanded" mode.',
			'Hover a parent and the siblings you share through it light up, with the label of their group; hover a sibling and the parent it came through lights up. That\'s TheBrain\'s way of showing why siblings come in groups: each group is one parent\'s other children.'
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
		concepts: ['looking-up', 'cycles'],
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
		concepts: ['cycles'],
		name: 'Force graph',
		component: ForceGraph,
		about: [
			"Ported from the force-directed Directus layout. Every node once, every edge drawn, so several parents and cycles are simply more lines. Each parent's links share a colour, so a node's parents read apart.",
			'Nodes are pulled into layers by depth, their shortest distance from a root, so parents mostly sit above their children. Arrows point from parent to child, and the edge that closes each cycle is drawn in the warning colour; jumps are dashed and have no direction. The whole graph at once is its strength and, past a few hundred nodes, its weakness — click or hover a node to fade everything but its neighbours. Zoomed out, the names fade away so the shape reads, as in Obsidian\'s graph; the focus and its neighbours stay named.'
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
		concepts: ['siblings'],
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
		concepts: ['siblings'],
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
