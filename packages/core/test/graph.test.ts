import { describe, expect, test } from 'bun:test';
import { createGraph, levelsWithin } from '../src/graph';
import { fromOutline } from '../src/outline';

const outline = (text: string) => createGraph(fromOutline({ id: 'test', name: 'Test', description: '' }, text));

const food = outline(`
Food
  Fruit
    Tomato
    Apple
  Vegetable
    Tomato
    Pumpkin
      Seeds`);

describe('relationships', () => {
	test('children in the order written, parents as many as there are', () => {
		expect(food.roots).toEqual(['food']);
		expect(food.children('vegetable')).toEqual(['tomato', 'pumpkin']);
		expect(food.parents('tomato')).toEqual(['fruit', 'vegetable']);
		expect(food.children('seeds')).toEqual([]);
	});

	test('siblings are grouped by the parent they share', () => {
		expect(food.siblings('tomato')).toEqual([
			{ via: 'fruit', siblings: ['apple'] },
			{ via: 'vegetable', siblings: ['pumpkin'] }
		]);
		expect(food.siblings('food')).toEqual([]);
	});

	test('rings outward, each node in the nearest ring', () => {
		expect(food.ancestors('tomato')).toEqual([['fruit', 'vegetable'], ['food']]);
		expect(food.descendants('food', 2)).toEqual([
			['fruit', 'vegetable'],
			['tomato', 'apple', 'pumpkin']
		]);
	});

	test('descendants are counted once however many routes reach them', () => {
		expect(food.descendantCount('food')).toBe(6);
		expect(food.descendantCount('vegetable')).toBe(3);
	});

	test('depth is the shortest distance from a root', () => {
		expect(food.depth('tomato')).toBe(2);
		expect(food.depth('seeds')).toBe(3);
	});

	test('an unknown node is an error, not undefined', () => {
		expect(() => food.node('nope')).toThrow('No node "nope"');
	});
});

describe('spanning tree', () => {
	test('a node is first reached through its first parent, depth first', () => {
		expect(food.spanningParent('tomato')).toBe('fruit');
		expect(food.spanningParent('food')).toBeNull();
	});

	test('depth first, not breadth first: a deep route can win over a shallow one', () => {
		const graph = outline(`
A
  B
    C
      D
A
  D`);
		expect(graph.spanningParent('d')).toBe('c');
	});
});

describe('cycles', () => {
	const cyclic = outline(`
Top
  A
    B
      A`);

	test('the edge that closes a cycle is marked, and only that one', () => {
		expect(cyclic.closesCycle('b', 'a')).toBe(true);
		expect(cyclic.closesCycle('a', 'b')).toBe(false);
		expect(cyclic.stats.cycles).toBe(1);
	});

	test('nodes only reachable round a cycle become roots, so none are lost', () => {
		const ring = outline(`
X
  Y
    X`);
		expect(ring.roots).toEqual(['x']);
		expect(ring.spanningParent('y')).toBe('x');
		expect(ring.spanningParent('x')).toBeNull();
	});

	test('routes never go round a loop', () => {
		expect(cyclic.paths('b').paths).toEqual([['top', 'a', 'b']]);
	});
});

describe('paths', () => {
	test('every route from a root, each root first', () => {
		expect(food.paths('tomato').paths).toEqual([
			['food', 'fruit', 'tomato'],
			['food', 'vegetable', 'tomato']
		]);
	});

	test('stop at the limit and say so', () => {
		const { paths, truncated } = food.paths('tomato', 1);
		expect(paths).toHaveLength(1);
		expect(truncated).toBe(true);
	});
});

test('levelsWithin keeps whole levels within the budget, but always one', () => {
	expect(levelsWithin([['a'], ['b', 'c'], ['d', 'e', 'f']], 3)).toEqual([['a'], ['b', 'c']]);
	expect(levelsWithin([['a', 'b', 'c', 'd']], 2)).toEqual([['a', 'b', 'c', 'd']]);
});
