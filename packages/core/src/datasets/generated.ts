import type { Polyhierarchy } from '../model';

/** mulberry32: small, seedable, so the generated dataset is the same on every load */
function random(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const groups = [
	{ name: 'Amber', colour: '#ffb300' },
	{ name: 'Teal', colour: '#26a69a' },
	{ name: 'Violet', colour: '#7e57c2' },
	{ name: 'Rose', colour: '#ec407a' }
];

/**
 * One root, then `size - 1` nodes each given one to three parents among the nodes before it,
 * favouring recent ones so it grows deep rather than flat. Every node descends from the root, and
 * parents always come earlier, so it's connected and acyclic until `backLinks` edges are added
 * pointing from a node to an earlier one.
 */
export function generated(size: number, { seed = 1, backLinks = 0 } = {}): Polyhierarchy {
	const next = random(seed);
	const id = (index: number) => `n${index}`;
	const edges: [string, string][] = [];
	const jumps: [string, string][] = [];

	for (let index = 1; index < size; index++) {
		const parentCount = Math.min(index, next() < 0.7 ? 1 : next() < 0.7 ? 2 : 3);
		const reach = Math.min(index, Math.max(parentCount, 3, Math.floor(index * 0.3)));
		const parents = new Set<number>();
		while (parents.size < parentCount) parents.add(index - 1 - Math.floor(next() * reach));
		for (const parent of parents) edges.push([id(parent), id(index)]);
		if (next() < 0.05) jumps.push([id(index), id(Math.floor(next() * index))]);
	}
	for (let added = 0; added < backLinks; added++) {
		const from = 1 + Math.floor(next() * (size - 1));
		edges.push([id(from), id(Math.floor(next() * from))]);
	}

	// Start on the best-connected node, so a neighbourhood view opens on something to see
	const links = new Map<string, number>();
	for (const pair of edges) for (const end of pair) links.set(end, (links.get(end) ?? 0) + 1);
	const start = [...links].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];

	return {
		id: `generated-${size}${backLinks ? '-cyclic' : ''}`,
		name: `Generated (${size} nodes${backLinks ? ', cyclic' : ''})`,
		description: `One root and seeded random nodes with one to three parents each and the odd jump${backLinks ? `, plus ${backLinks} edges pointing back up the hierarchy` : ''}, for seeing how each UI copes with scale.`,
		start,
		columns: [
			{ key: 'weight', label: 'Weight', type: 'number' },
			{ key: 'group', label: 'Group', type: 'text' }
		],
		nodes: Array.from({ length: size }, (_, index) => {
			const group = groups[Math.floor(next() * groups.length)]!;
			return {
				id: id(index),
				label: `Node ${index}`,
				colour: group.colour,
				fields: { weight: Math.round(next() * 100), group: group.name }
			};
		}),
		edges,
		jumps
	};
}
