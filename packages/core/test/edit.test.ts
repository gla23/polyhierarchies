import { describe, expect, test } from 'bun:test';
import { addJump, addNode, link, move, removeJump, removeNode, unlink, updateNode } from '../src/edit';
import { createGraph } from '../src/graph';
import { fromOutline } from '../src/outline';

const food = () =>
	fromOutline(
		{ id: 'food', name: 'Food', description: '', start: 'tomato' },
		`
Fruit
  Tomato
  Apple
  Pear
Vegetable
  Tomato
  Pumpkin
---
Tomato ~ Pumpkin`
	);

describe('edits return a new dataset', () => {
	test('and leave the one they were given alone', () => {
		const data = food();
		const before = structuredClone(data);
		updateNode(data, 'apple', { label: 'Green apple' });
		addNode(data, 'Kiwi', 'fruit');
		removeNode(data, 'tomato');
		link(data, 'vegetable', 'apple');
		unlink(data, 'fruit', 'tomato');
		move(data, 'pear', 'fruit', 'vegetable', 0);
		addJump(data, 'apple', 'pear');
		removeJump(data, 'tomato', 'pumpkin');
		expect(data).toEqual(before);
	});
});

test('updateNode patches one node', () => {
	const data = updateNode(food(), 'apple', { label: 'Green apple', colour: 'green' });
	expect(data.nodes.find((node) => node.id === 'apple')).toEqual({ id: 'apple', label: 'Green apple', colour: 'green' });
});

describe('addNode', () => {
	test('under a parent, last among its children', () => {
		const { id, data } = addNode(food(), 'Kiwi', 'fruit');
		expect(id).toBe('kiwi');
		expect(createGraph(data).children('fruit')).toEqual(['tomato', 'apple', 'pear', 'kiwi']);
	});

	test('an id already taken gets a number', () => {
		const { id } = addNode(food(), 'Apple', null);
		expect(id).toBe('apple-2');
	});

	test('a label with nothing to slug still gets an id', () => {
		expect(addNode(food(), '!!!', null).id).toBe('node');
	});
});

test('removeNode takes its edges, jumps and the start with it', () => {
	const data = removeNode(food(), 'tomato');
	expect(data.nodes.some((node) => node.id === 'tomato')).toBe(false);
	expect(data.edges.flat()).not.toContain('tomato');
	expect(data.jumps).toEqual([]);
	expect(data.start).toBeUndefined();
});

describe('link and unlink', () => {
	test('a new parent is added alongside the others', () => {
		expect(createGraph(link(food(), 'vegetable', 'apple')).parents('apple')).toEqual(['fruit', 'vegetable']);
	});

	test('an edge that exists, or to itself, changes nothing', () => {
		const data = food();
		expect(link(data, 'fruit', 'tomato')).toBe(data);
		expect(link(data, 'fruit', 'fruit')).toBe(data);
	});

	test('a cycle is allowed', () => {
		expect(createGraph(link(food(), 'tomato', 'fruit')).children('tomato')).toEqual(['fruit']);
	});

	test('unlink takes only that parent', () => {
		expect(createGraph(unlink(food(), 'fruit', 'tomato')).parents('tomato')).toEqual(['vegetable']);
	});
});

describe('move', () => {
	const children = (data: ReturnType<typeof food>, id: string) => createGraph(data).children(id);

	test('reorders within the same parent', () => {
		expect(children(move(food(), 'pear', 'fruit', 'fruit', 0), 'fruit')).toEqual(['pear', 'tomato', 'apple']);
		expect(children(move(food(), 'tomato', 'fruit', 'fruit', 2), 'fruit')).toEqual(['apple', 'pear', 'tomato']);
	});

	test('to another parent, at the position given', () => {
		const data = move(food(), 'apple', 'fruit', 'vegetable', 1);
		expect(children(data, 'fruit')).toEqual(['tomato', 'pear']);
		expect(children(data, 'vegetable')).toEqual(['tomato', 'apple', 'pumpkin']);
	});

	test('past the end goes last', () => {
		expect(children(move(food(), 'apple', 'fruit', 'vegetable', 99), 'vegetable')).toEqual(['tomato', 'pumpkin', 'apple']);
	});

	test('only the placement dragged moves: its other parents stay', () => {
		const data = move(food(), 'tomato', 'vegetable', 'fruit', 0);
		expect(createGraph(data).parents('tomato')).toEqual(['fruit']);
		expect(children(data, 'fruit')).toEqual(['tomato', 'apple', 'pear']);
		expect(children(move(food(), 'tomato', 'fruit', 'vegetable', 1), 'fruit')).toEqual(['apple', 'pear']);
	});

	test('to the top level drops the parent', () => {
		expect(createGraph(move(food(), 'apple', 'fruit', null, 0)).roots).toContain('apple');
	});

	test('from the top level adds a parent', () => {
		const data = move(food(), 'vegetable', null, 'fruit', 0);
		expect(children(data, 'fruit')).toEqual(['vegetable', 'tomato', 'apple', 'pear']);
	});

	test('into itself changes nothing', () => {
		const data = food();
		expect(move(data, 'fruit', null, 'fruit', 0)).toBe(data);
	});
});

describe('jumps', () => {
	test('one each way at most, and never to itself', () => {
		const data = food();
		expect(addJump(data, 'pumpkin', 'tomato')).toBe(data);
		expect(addJump(data, 'apple', 'apple')).toBe(data);
		expect(addJump(data, 'apple', 'pear').jumps).toEqual([
			['tomato', 'pumpkin'],
			['apple', 'pear']
		]);
	});

	test('removed whichever way round they were written', () => {
		expect(removeJump(food(), 'pumpkin', 'tomato').jumps).toEqual([]);
	});
});
