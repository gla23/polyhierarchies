import type { PolyNode, Polyhierarchy } from './model';

export type Graph = ReturnType<typeof createGraph>;

export interface SiblingGroup {
	/** The parent these siblings share with the node */
	via: string;
	siblings: string[];
}

function adjacency(pairs: [string, string][]) {
	const map = new Map<string, string[]>();
	for (const [from, to] of pairs) {
		const list = map.get(from);
		if (list) list.push(to);
		else map.set(from, [to]);
	}
	return map;
}

/** Every UI reads a polyhierarchy through this, so they all agree on what each relationship is */
export function createGraph(data: Polyhierarchy) {
	const byId = new Map(data.nodes.map((node) => [node.id, node]));
	const childrenOf = adjacency(data.edges);
	const parentsOf = adjacency(data.edges.map(([parent, child]) => [child, parent]));
	const jumpsOf = adjacency([...data.jumps, ...data.jumps.map(([a, b]): [string, string] => [b, a])]);

	const node = (id: string): PolyNode => {
		const found = byId.get(id);
		if (!found) throw new Error(`No node "${id}" in ${data.id}`);
		return found;
	};
	const children = (id: string) => childrenOf.get(id) ?? [];
	const parents = (id: string) => parentsOf.get(id) ?? [];
	const jumps = (id: string) => jumpsOf.get(id) ?? [];

	/**
	 * A spanning tree: depth-first from the roots, children in the order they were written, keeping
	 * the parent each node is first reached through. It's where a tree view that renders each node
	 * once draws it in full, knowing up front which placement the full render would reach first.
	 * Nodes reachable only round a cycle get the first of them as an extra root, so none are lost.
	 */
	const roots = data.nodes.filter((node) => !parents(node.id).length).map((node) => node.id);
	const spanningParent = new Map<string, string | null>();
	const onPath = new Set<string>();
	/** Edges from a node to one of its own ancestors on the walk: where each cycle closes */
	const backEdges = new Set<string>();
	const walk = (id: string) => {
		onPath.add(id);
		for (const child of children(id)) {
			if (onPath.has(child)) backEdges.add(`${id}>${child}`);
			if (spanningParent.has(child)) continue;
			spanningParent.set(child, id);
			walk(child);
		}
		onPath.delete(id);
	};
	const enter = (id: string) => {
		spanningParent.set(id, null);
		walk(id);
	};
	roots.forEach(enter);
	for (const { id } of data.nodes)
		if (!spanningParent.has(id)) {
			roots.push(id);
			enter(id);
		}

	/** Shortest distance from a root. The longest would keep children below every parent, but a
	 *  cycle makes it infinite. */
	const depths = new Map(roots.map((id) => [id, 0]));
	for (let frontier = roots; frontier.length; ) {
		const next: string[] = [];
		for (const id of frontier)
			for (const child of children(id))
				if (!depths.has(child)) {
					depths.set(child, depths.get(id)! + 1);
					next.push(child);
				}
		frontier = next;
	}

	/** Grouped by the parent they share, as a node with two parents has two sets of siblings */
	const siblings = (id: string): SiblingGroup[] =>
		parents(id)
			.map((via) => ({ via, siblings: children(via).filter((sibling) => sibling !== id) }))
			.filter((group) => group.siblings.length);

	/** Rings outward from `id`, one step per ring, each node in the nearest ring it reaches */
	const rings = (id: string, step: (id: string) => string[], max: number) => {
		const seen = new Set([id]);
		const out: string[][] = [];
		let frontier = [id];
		while (out.length < max) {
			const next = [...new Set(frontier.flatMap(step))].filter((other) => !seen.has(other));
			if (!next.length) break;
			for (const other of next) seen.add(other);
			out.push(next);
			frontier = next;
		}
		return out;
	};

	const rootSet = new Set(roots);

	/**
	 * Every route from a root down to `id`, each root first. It climbs only edges that don't close a
	 * cycle: a route round a loop isn't a route from the top, and allowing them let a well-connected
	 * node wander through thousands of dead ends. Without them every climb reaches a root, but a node
	 * can still have thousands of routes, so it stops at `limit`.
	 */
	const paths = (id: string, limit = 50) => {
		const found: string[][] = [];
		let truncated = false;
		const climb = (at: string, below: string[]) => {
			if (found.length >= limit) return void (truncated = true);
			const path = [at, ...below];
			const up = parents(at).filter((parent) => !backEdges.has(`${parent}>${at}`));
			if (rootSet.has(at) || !up.length) found.push(path);
			if (rootSet.has(at)) return;
			for (const parent of up) climb(parent, path);
		};
		climb(id, []);
		return { paths: found, truncated };
	};

	return {
		data,
		roots,
		paths,
		node,
		label: (id: string) => node(id).label,
		children,
		parents,
		jumps,
		siblings,
		/** null for a root */
		spanningParent: (id: string) => spanningParent.get(id) ?? null,
		depth: (id: string) => depths.get(id) ?? 0,
		/** Whether this parent → child edge is the one that closes a cycle, from the walk's view */
		closesCycle: (parent: string, child: string) => backEdges.has(`${parent}>${child}`),
		/** Parents, then grandparents, …, up to `max` levels */
		ancestors: (id: string, max = Infinity) => rings(id, parents, max),
		/** Children, then grandchildren, …, up to `max` levels */
		descendants: (id: string, max = Infinity) => rings(id, children, max),
		stats: {
			nodes: data.nodes.length,
			edges: data.edges.length,
			jumps: data.jumps.length,
			roots: roots.length,
			multiParent: data.nodes.filter((node) => parents(node.id).length > 1).length,
			mostParents: Math.max(0, ...data.nodes.map((node) => parents(node.id).length)),
			/** Edges that lead back to one of their own ancestors */
			cycles: backEdges.size
		}
	};
}

/**
 * The first levels whose nodes fit `budget` between them, but always at least one: how a view can
 * show grandparents when there's room for them and stop before they'd crowd the screen.
 */
export function levelsWithin(levels: string[][], budget: number) {
	const kept: string[][] = [];
	let count = 0;
	for (const level of levels) {
		if (kept.length && count + level.length > budget) break;
		kept.push(level);
		count += level.length;
	}
	return kept;
}
