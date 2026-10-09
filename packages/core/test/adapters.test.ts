import { describe, expect, test } from 'bun:test';
import { fromJunction, fromParentField } from '../src/adapters';
import { datasets } from '../src/datasets';
import { generated } from '../src/datasets/generated';
import { createGraph } from '../src/graph';
import { invert } from '../src/invert';

describe('fromParentField', () => {
	test('each row under the parent it names, in the rows\' order', () => {
		const data = fromParentField(
			[
				{ id: 1, parent: null },
				{ id: 3, parent: 1 },
				{ id: 2, parent: { id: 1 } }
			],
			{ id: 'test', key: 'id', parent: 'parent' }
		);
		expect(data.nodes.map((node) => node.id)).toEqual(['1', '3', '2']);
		expect(data.edges).toEqual([
			['1', '3'],
			['1', '2']
		]);
	});

	test('a row whose parent isn\'t loaded is drawn at the top, not lost', () => {
		const data = fromParentField([{ id: 'a', parent: 'gone' }], { id: 'test', key: 'id', parent: 'parent' });
		expect(createGraph(data).roots).toEqual(['a']);
	});
});

describe('fromJunction', () => {
	const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
	const options = { id: 'test', key: 'id', parent: 'from', child: 'to' };

	test('a node gets as many parents as it has links', () => {
		const graph = createGraph(fromJunction(rows, [{ from: 1, to: 3 }, { from: 2, to: 3 }], options));
		expect(graph.parents('3')).toEqual(['1', '2']);
	});

	test('children in the sort field\'s order, unsorted links last', () => {
		const links = [
			{ from: 1, to: 2, sort: null },
			{ from: 1, to: 3, sort: 1 }
		];
		expect(createGraph(fromJunction(rows, links, { ...options, sort: 'sort' })).children('1')).toEqual(['3', '2']);
	});

	test('a pair linked twice is one edge, and links to rows not loaded are dropped', () => {
		const links = [
			{ from: 1, to: 2 },
			{ from: 1, to: 2 },
			{ from: 1, to: 99 },
			{ from: null, to: 3 }
		];
		expect(fromJunction(rows, links, options).edges).toEqual([['1', '2']]);
	});
});

test('invert swaps every edge and gets an id of its own', () => {
	const data = invert({ id: 'x', name: 'X', description: '', nodes: [], edges: [['a', 'b']], jumps: [] });
	expect(data.id).toBe('x~inverted');
	expect(data.edges).toEqual([['b', 'a']]);
});

test('the generated dataset is the same on every load', () => {
	expect(generated(200, { seed: 3, backLinks: 5 })).toEqual(generated(200, { seed: 3, backLinks: 5 }));
});

test('every dataset reads as a graph, with its start among its nodes', () => {
	for (const data of datasets) {
		const graph = createGraph(data);
		const ids = new Set(data.nodes.map((node) => node.id));
		expect(ids.size).toBe(data.nodes.length);
		for (const [parent, child] of data.edges) expect(ids.has(parent) && ids.has(child)).toBe(true);
		if (data.start) expect(ids.has(data.start)).toBe(true);
		expect(graph.roots.length).toBeGreaterThan(0);
	}
});
