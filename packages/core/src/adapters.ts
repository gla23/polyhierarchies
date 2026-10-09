import type { Polyhierarchy } from './model';

type Row = Record<string, unknown>;

/** A key as a node id: graphs key nodes by string, rows by whatever their primary key is */
const nodeId = (value: unknown, key: string): string | null => {
	if (value === null || value === undefined) return null;
	// A relation can arrive expanded ({ id: 8 }) or as the bare key (8)
	if (typeof value === 'object') return nodeId((value as Row)[key], key);
	return String(value);
};

/**
 * A taxonomy: every row names its one parent in a field (a self-referencing many-to-one). Nodes are
 * the rows, in the order given, so children come out in that order too: sort the rows first. A row
 * whose parent isn't among them is drawn at the top level rather than lost.
 */
export function fromParentField(
	rows: Row[],
	{ id, key, parent, label }: { id: string; key: string; parent: string; label?: (row: Row) => string }
): Polyhierarchy {
	const ids = new Set(rows.map((row) => nodeId(row[key], key)));
	return {
		id,
		name: id,
		description: '',
		nodes: rows.map((row) => {
			const node = nodeId(row[key], key)!;
			return { id: node, label: label?.(row) ?? node };
		}),
		edges: rows.flatMap((row): [string, string][] => {
			const from = nodeId(row[parent], key);
			return from !== null && ids.has(from) ? [[from, nodeId(row[key], key)!]] : [];
		}),
		jumps: []
	};
}

/**
 * A polyhierarchy: links in a junction collection, each naming a parent and a child, so a node has
 * as many parents as it has links. Nodes are the rows, in the order given; a parent's children are
 * ordered by the links' `sort` field when there is one (so a node can be first under one parent and
 * last under another), otherwise in the order the links come. Links to a row that isn't among them
 * (filtered out, say) are left out, so a node whose parents all are is drawn at the top level.
 * Swapping `parent` and `child` turns the whole thing upside down, as `invert` does.
 */
export function fromJunction(
	rows: Row[],
	links: Row[],
	{
		id,
		key,
		parent,
		child,
		sort,
		label
	}: { id: string; key: string; parent: string; child: string; sort?: string | null; label?: (row: Row) => string }
): Polyhierarchy {
	const ids = new Set(rows.map((row) => nodeId(row[key], key)));
	const ordered = sort
		? [...links].sort((a, b) => Number(a[sort] ?? Infinity) - Number(b[sort] ?? Infinity))
		: links;
	const seen = new Set<string>();
	return {
		id,
		name: id,
		description: '',
		nodes: rows.map((row) => {
			const node = nodeId(row[key], key)!;
			return { id: node, label: label?.(row) ?? node };
		}),
		edges: ordered.flatMap((link): [string, string][] => {
			const from = nodeId(link[parent], key);
			const to = nodeId(link[child], key);
			// The same pair linked twice is still one edge
			if (from === null || to === null || !ids.has(from) || !ids.has(to) || seen.has(`${from}>${to}`)) return [];
			seen.add(`${from}>${to}`);
			return [[from, to]];
		}),
		jumps: []
	};
}
