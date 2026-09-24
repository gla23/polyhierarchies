import type { Graph } from '@polyhierarchies/core';

export interface LaidOutNode {
	id: string;
	layer: number;
	x: number;
	y: number;
	width: number;
}

export interface LaidOutEdge {
	from: string;
	to: string;
	kind: 'hierarchy' | 'cycle' | 'jump';
}

export interface Spacing {
	layerGap: number;
	nodeGap: number;
	nodeHeight: number;
}

/**
 * A compact Sugiyama layout: the steps d3-dag and Graphviz take, kept small enough to read.
 *
 * 1. Cycles are broken at the edges the graph already knows close them, which are drawn separately.
 * 2. Each node goes in the layer one below its deepest parent (longest path), so every child sits
 *    below all of its parents, which is what a polyhierarchy needs and a force layout can't promise.
 * 3. Within each layer, nodes are ordered by the average position of their neighbours in the layer
 *    above, then the layer below, a few sweeps each way, which untangles most crossings.
 * 4. Each node is placed under the middle of its parents, then pushed apart just enough not to
 *    overlap, keeping the order step 3 chose.
 */
export function layeredLayout(
	graph: Graph,
	ids: string[],
	widthOf: (id: string) => number,
	{ layerGap, nodeGap, nodeHeight }: Spacing
) {
	const included = new Set(ids);
	const edges: LaidOutEdge[] = [];
	for (const [parent, child] of graph.data.edges)
		if (included.has(parent) && included.has(child))
			edges.push({
				from: parent,
				to: child,
				kind: graph.closesCycle(parent, child) ? 'cycle' : 'hierarchy'
			});
	for (const [a, b] of graph.data.jumps)
		if (included.has(a) && included.has(b)) edges.push({ from: a, to: b, kind: 'jump' });

	const down = edges.filter((edge) => edge.kind === 'hierarchy');
	const parentsOf = new Map<string, string[]>(ids.map((id) => [id, []]));
	const childrenOf = new Map<string, string[]>(ids.map((id) => [id, []]));
	for (const { from, to } of down) {
		parentsOf.get(to)!.push(from);
		childrenOf.get(from)!.push(to);
	}

	// 2. Longest-path layering, safe now the cycle-closing edges are out
	const layerOf = new Map<string, number>();
	const layer = (id: string): number => {
		let known = layerOf.get(id);
		if (known === undefined) {
			known = Math.max(-1, ...parentsOf.get(id)!.map(layer)) + 1;
			layerOf.set(id, known);
		}
		return known;
	};
	const layers: string[][] = [];
	for (const id of ids) (layers[layer(id)] ??= []).push(id);

	// 3. Barycentre ordering: sort each layer by where its neighbours sit next door
	const position = new Map<string, number>();
	const index = () => layers.forEach((nodes) => nodes.forEach((id, at) => position.set(id, at)));
	index();
	const byNeighbours = (nodes: string[], neighbours: (id: string) => string[]) => {
		const centre = (id: string) => {
			const around = neighbours(id).map((other) => position.get(other)!);
			return around.length ? around.reduce((sum, at) => sum + at, 0) / around.length : position.get(id)!;
		};
		const weights = new Map(nodes.map((id) => [id, centre(id)]));
		nodes.sort((a, b) => weights.get(a)! - weights.get(b)!);
	};
	for (let sweep = 0; sweep < 4; sweep++) {
		for (let at = 1; at < layers.length; at++) {
			byNeighbours(layers[at]!, (id) => parentsOf.get(id)!);
			index();
		}
		for (let at = layers.length - 2; at >= 0; at--) {
			byNeighbours(layers[at]!, (id) => childrenOf.get(id)!);
			index();
		}
	}

	// 4. Under the middle of its parents, then spread just enough not to overlap
	const x = new Map<string, number>();
	layers.forEach((nodes, at) => {
		const wanted = nodes.map((id) => {
			const parents = parentsOf.get(id)!.filter((parent) => x.has(parent));
			return parents.length
				? parents.reduce((sum, parent) => sum + x.get(parent)!, 0) / parents.length
				: 0;
		});
		// The top layer, with no parents to sit under, is simply packed from the left
		let edge = at === 0 ? -nodeGap : -Infinity;
		const placed = nodes.map((id, order) => {
			const half = widthOf(id) / 2;
			const clear = edge + half + nodeGap;
			const centre = at === 0 ? clear : Math.max(wanted[order]!, clear);
			edge = centre + half;
			return centre;
		});
		// Pushing right drifts the whole layer; shift it back so it's centred on where it wanted to be
		const drift =
			placed.reduce((sum, centre, order) => sum + centre - wanted[order]!, 0) / (placed.length || 1);
		nodes.forEach((id, order) => x.set(id, placed[order]! - (at === 0 ? 0 : drift)));
	});

	const nodes: LaidOutNode[] = ids.map((id) => ({
		id,
		layer: layerOf.get(id)!,
		x: x.get(id)!,
		y: layerOf.get(id)! * (layerGap + nodeHeight),
		width: widthOf(id)
	}));

	// Everything shifted so the leftmost edge sits at zero
	const left = Math.min(...nodes.map((node) => node.x - node.width / 2));
	for (const node of nodes) node.x -= left;
	const width = Math.max(0, ...nodes.map((node) => node.x + node.width / 2));
	const height = Math.max(0, ...nodes.map((node) => node.y + nodeHeight));

	return { nodes, edges, width, height };
}
