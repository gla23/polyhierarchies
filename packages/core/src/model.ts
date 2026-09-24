export type FieldValue = string | number | boolean | null;

export interface PolyNode {
	id: string;
	label: string;
	/** Iconify `prefix:name`, or a bare Material Symbols name */
	icon?: string;
	/** Any CSS colour */
	colour?: string;
	/** Values for the dataset's `columns`, by key */
	fields?: Record<string, FieldValue>;
}

/** An extra property every node in a dataset may have, beyond label, icon and colour */
export interface Column {
	key: string;
	label: string;
	type: 'text' | 'number' | 'boolean';
}

/**
 * A node may have any number of parents, and edges may loop back round (a cycle is data, not an
 * error: every UI has to cope). Siblings aren't stored: see `siblings` in graph.ts.
 */
export interface Polyhierarchy {
	id: string;
	name: string;
	description: string;
	/** Where a UI with a focus lands first: the node that best shows off the dataset */
	start?: string;
	columns?: Column[];
	nodes: PolyNode[];
	/** Parent → child, in order: a parent's children are listed in the order of its edges */
	edges: [parent: string, child: string][];
	/** Undirected "related to" links outside the hierarchy — TheBrain's jumps */
	jumps: [string, string][];
}
