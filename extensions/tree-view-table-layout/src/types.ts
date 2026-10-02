import type { PrimaryKey } from '@directus/types';

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
	parent?: string | null;
	/** How many columns, from the first, move with the hierarchy */
	shiftedColumns?: number;
	/** The faint lines from an open item's chevron down everything inside it */
	showGuides?: boolean;
	/** How many levels start open, below which items start folded; unset, everything starts open */
	openDepth?: number | null;
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
	parent: { id: PrimaryKey; parent: PrimaryKey | null } | null;
}
