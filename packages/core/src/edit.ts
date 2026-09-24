import type { PolyNode, Polyhierarchy } from './model';
import { slug } from './outline';

/**
 * Every change a UI can make, each returning a new dataset rather than changing the one it was
 * given, so the playground can save it, compare it and reset it. Cycles are allowed, so nothing
 * here refuses an edge for closing one.
 */

type Patch = Partial<Omit<PolyNode, 'id'>>;

export function updateNode(data: Polyhierarchy, id: string, patch: Patch): Polyhierarchy {
	return { ...data, nodes: data.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)) };
}

/** A new node, under `parent` or at the top level. Returns its id with the dataset. */
export function addNode(data: Polyhierarchy, label: string, parent: string | null) {
	const taken = new Set(data.nodes.map((node) => node.id));
	const base = slug(label) || 'node';
	let id = base;
	for (let suffix = 2; taken.has(id); suffix++) id = `${base}-${suffix}`;
	const added: Polyhierarchy = { ...data, nodes: [...data.nodes, { id, label }] };
	return { id, data: parent ? link(added, parent, id) : added };
}

export function removeNode(data: Polyhierarchy, id: string): Polyhierarchy {
	return {
		...data,
		nodes: data.nodes.filter((node) => node.id !== id),
		edges: data.edges.filter((edge) => !edge.includes(id)),
		jumps: data.jumps.filter((jump) => !jump.includes(id)),
		start: data.start === id ? undefined : data.start
	};
}

const hasEdge = (data: Polyhierarchy, parent: string, child: string) =>
	data.edges.some(([from, to]) => from === parent && to === child);

/** Adds `parent` to `child`'s parents, keeping the ones it already has */
export function link(data: Polyhierarchy, parent: string, child: string): Polyhierarchy {
	if (parent === child || hasEdge(data, parent, child)) return data;
	return { ...data, edges: [...data.edges, [parent, child]] };
}

export function unlink(data: Polyhierarchy, parent: string, child: string): Polyhierarchy {
	return { ...data, edges: data.edges.filter(([from, to]) => !(from === parent && to === child)) };
}

/**
 * Moves one placement of `child`: from under `from` (null for the top level) to position `index`
 * among `to`'s children. Its other parents are untouched — only the placement being dragged moves.
 */
export function move(
	data: Polyhierarchy,
	child: string,
	from: string | null,
	to: string | null,
	index: number
): Polyhierarchy {
	let moved = from ? unlink(data, from, child) : data;
	if (!to) return moved;
	if (to === child) return data;
	moved = unlink(moved, to, child);

	// A parent's children are its edges in order, so the position is where the edge goes
	const edges = [...moved.edges];
	const siblingEdges = edges
		.map((edge, position) => ({ edge, position }))
		.filter(({ edge }) => edge[0] === to);
	const before = siblingEdges[index];
	edges.splice(before ? before.position : (siblingEdges.at(-1)?.position ?? edges.length - 1) + 1, 0, [
		to,
		child
	]);
	return { ...moved, edges };
}

export function addJump(data: Polyhierarchy, a: string, b: string): Polyhierarchy {
	const exists = data.jumps.some((jump) => jump.includes(a) && jump.includes(b));
	if (a === b || exists) return data;
	return { ...data, jumps: [...data.jumps, [a, b]] };
}

export function removeJump(data: Polyhierarchy, a: string, b: string): Polyhierarchy {
	return { ...data, jumps: data.jumps.filter((jump) => !(jump.includes(a) && jump.includes(b))) };
}
