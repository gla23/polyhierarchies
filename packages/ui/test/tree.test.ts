import { describe, expect, test } from 'bun:test';
import { createGraph, fromOutline } from '@polyhierarchies/core';
import { generated } from '../../core/src/datasets/generated';
import { ref } from 'vue';
import { placementTree, useTree, type Repeat } from '../src/tree';

const outline = (text: string) => createGraph(fromOutline({ id: 'test', name: 'Test', description: '' }, text));

const food = outline(`
Fruit
  Tomato
    Seeds
  Apple
Vegetable
  Tomato`);

const cyclic = outline(`
Top
  A
    B
      A`);

describe('placementTree', () => {
	test('in full where first reached, a terminal duplicate everywhere else', () => {
		const rows = placementTree(food, 'once');
		expect(rows.map((row) => row.key)).toEqual(['fruit', 'fruit/tomato', 'fruit/tomato/seeds', 'fruit/apple', 'vegetable', 'vegetable/tomato']);
		const duplicate = rows.at(-1)!;
		expect(duplicate).toMatchObject({ full: false, home: 'fruit', hasChildren: false, parentKey: 'vegetable', depth: 1 });
		expect(rows[1]).toMatchObject({ full: true, home: null, hasChildren: true });
	});

	test('mirrors are drawn in full everywhere', () => {
		const rows = placementTree(food, 'mirror');
		expect(rows.map((row) => row.key)).toContain('vegetable/tomato/seeds');
		expect(rows.find((row) => row.key === 'vegetable/tomato')).toMatchObject({ full: true, mirror: true });
	});

	test('where a cycle closes, a loop rather than forever', () => {
		for (const repeat of ['once', 'mirror'] as Repeat[]) {
			const rows = placementTree(cyclic, repeat);
			expect(rows.map((row) => row.key)).toEqual(['top', 'top/a', 'top/a/b', 'top/a/b/a']);
			expect(rows.at(-1)).toMatchObject({ loop: true, full: false, hasChildren: false });
		}
	});

	test('a row\'s descendants are every row after it until its subtree ends', () => {
		const rows = placementTree(food, 'once');
		expect(rows[0]!.descendants).toEqual(['fruit/tomato', 'fruit/tomato/seeds', 'fruit/apple']);
		expect(rows[1]!.descendants).toEqual(['fruit/tomato/seeds']);
		expect(rows.at(-1)!.descendants).toEqual([]);
	});

	test('a row per edge and root however many, as only mirrors are capped', () => {
		const graph = createGraph(generated(3000));
		expect(placementTree(graph, 'once')).toHaveLength(graph.data.edges.length + graph.roots.length);
		expect(placementTree(graph, 'mirror')).toHaveLength(3000);
	});
});

describe('useTree', () => {
	const tree = (graph: ReturnType<typeof outline>, repeat: Repeat = 'once', openDepth?: number) =>
		useTree(ref(graph), ref<string | null>(null), ref(repeat), undefined, ref(openDepth));
	const keys = (rows: { key: string }[]) => rows.map((row) => row.key);

	test('starts folded, or open to the depth given', () => {
		expect(keys(tree(food).rows.value)).toEqual(['fruit', 'vegetable']);
		expect(keys(tree(food, 'once', 1).rows.value)).toEqual(['fruit', 'fruit/tomato', 'fruit/apple', 'vegetable', 'vegetable/tomato']);
	});

	// The rule the table and the other tree UIs share: they mustn't disagree on what's drawn. Within
	// the mirrors' cap, which each applies its own way: to rows opened here, to rows drawn there.
	test('unfolded, it draws exactly the placement tree', () => {
		for (const graph of [food, cyclic, createGraph(generated(50, { backLinks: 3 }))])
			for (const repeat of ['once', 'mirror'] as Repeat[]) {
				const { rows, unfoldAll } = tree(graph, repeat);
				unfoldAll();
				const placements = placementTree(graph, repeat);
				expect(keys(rows.value)).toEqual(keys(placements));
				expect(rows.value.map(({ full, loop, home }) => ({ full, loop, home }))).toEqual(
					placements.map(({ full, loop, home }) => ({ full, loop, home }))
				);
			}
	});

	test('a focus opens the way to where it\'s drawn in full', () => {
		const focus = ref<string | null>('seeds');
		const { rows } = useTree(ref(food), focus, ref<Repeat>('once'));
		expect(keys(rows.value)).toContain('fruit/tomato/seeds');
	});

	test('toggle opens and folds one placement, not the node everywhere', () => {
		const { rows, toggle } = tree(food, 'mirror', 1);
		toggle(rows.value.find((row) => row.key === 'vegetable/tomato')!);
		expect(keys(rows.value)).toContain('vegetable/tomato/seeds');
		expect(keys(rows.value)).not.toContain('fruit/tomato/seeds');
	});
});
