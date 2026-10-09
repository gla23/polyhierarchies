import type { PrimaryKey } from '@directus/types';

/** What a filter or a search does to the tree; off sets it aside without clearing it */
export type LayerMode = 'off' | 'hide' | 'routes' | 'inplace';

// CORE CLONE
export interface LayoutOptions {
	widths?: {
		[field: string]: number;
	};
	align?: {
		[field: string]: 'left' | 'center' | 'right';
	};
	limit?: number;
	spacing?: 'comfortable' | 'cozy' | 'compact';
	/** One parent field (a taxonomy), or a junction of parent → child links (a polyhierarchy) */
	hierarchy?: 'taxonomy' | 'polyhierarchy';
	parent?: string | null;
	/** In a polyhierarchy: the junction collection, which of its fields is the parent and which the
	 *  child, and the integer field ordering one parent's children */
	junction?: string | null;
	junctionParent?: string | null;
	junctionChild?: string | null;
	junctionSort?: string | null;
	/** The column the hierarchy indents, by key; `$controls` for none (only the controls indent) */
	treeColumn?: string;
	/** While searching: open the routes to the matches, or keep the folds and mark them */
	searchMode?: LayerMode;
	/** The same for filters: hide, by default, as a filter usually excludes */
	filterMode?: LayerMode;
	/** The search and filter menus in the top bar; off keeps the bar clean, the sidebar still has them */
	modeMenus?: boolean;
	/** The faint lines from an open item's chevron down everything inside it */
	showGuides?: boolean;
	/** How many levels start open, below which items start folded; unset, everything starts open */
	openDepth?: number | null;
	/** The most levels Unfold all and a search's routes open; -1 for no limit */
	maxOpenDepth?: number | null;
	/** What a click on a row does: open the item, as Directus does, or select the row */
	rowClick?: 'opens' | 'selects';
}

export interface LayoutQuery {
	fields: string[];
	sort: string[];
	page: number;
	limit: number;
}

/** What a drag in the tree changed: the rows' new order, and the dragged item's new parent */
export interface TreeEdits {
	order: PrimaryKey[] | null;
	/** The dragged item's new parent, and the one it was dragged from (several, once it can have several) */
	parent: { id: PrimaryKey; parent: PrimaryKey | null; from: PrimaryKey | null } | null;
	/** The same drop by node: the placement under `from` went to position `index` under `to`; with
	 *  `link`, Alt was held, so `to` is added as a parent and `from` kept */
	moved?: { node: string; from: string | null; to: string | null; index: number; link: boolean } | null;
}
