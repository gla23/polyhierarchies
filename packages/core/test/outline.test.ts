import { describe, expect, test } from 'bun:test';
import { fromOutline, slug } from '../src/outline';

const meta = { id: 'test', name: 'Test', description: '' };

describe('fromOutline', () => {
	test('a label written twice is one node with two parents', () => {
		const data = fromOutline(
			meta,
			`
Fruit
  Tomato
Vegetable
  Tomato
  Pumpkin`
		);
		expect(data.nodes.map((node) => node.id)).toEqual(['fruit', 'tomato', 'vegetable', 'pumpkin']);
		expect(data.edges).toEqual([
			['fruit', 'tomato'],
			['vegetable', 'tomato'],
			['vegetable', 'pumpkin']
		]);
	});

	test('repeating a label at the top level adds to its children', () => {
		const data = fromOutline(meta, 'Fruit\n  Apple\nVegetable\nFruit\n  Pear');
		expect(data.edges).toEqual([
			['fruit', 'apple'],
			['fruit', 'pear']
		]);
	});

	test('the same edge written twice is one edge', () => {
		const data = fromOutline(meta, 'Fruit\n  Apple\nFruit\n  Apple');
		expect(data.edges).toEqual([['fruit', 'apple']]);
	});

	test('lines after --- are jumps', () => {
		const data = fromOutline(meta, 'Fruit\n  Tomato\nVegetable\n  Pumpkin\n---\nTomato ~ Pumpkin');
		expect(data.jumps).toEqual([['tomato', 'pumpkin']]);
	});

	test('details join their nodes by label', () => {
		const data = fromOutline(meta, 'Fruit\n  Red apple', { 'Red apple': { colour: 'red' } });
		expect(data.nodes[1]).toEqual({ id: 'red-apple', label: 'Red apple', colour: 'red' });
	});

	test('mistakes are refused, not guessed at', () => {
		expect(() => fromOutline(meta, 'Fruit\n   Apple')).toThrow('Odd indent');
		expect(() => fromOutline(meta, 'Fruit\n    Apple')).toThrow('skips a level');
		expect(() => fromOutline(meta, 'Fruit\n---\nFruit')).toThrow('Jumps are written');
		expect(() => fromOutline(meta, 'Fruit', { Pear: {} })).toThrow('Details for "pear"');
	});
});

test('slug', () => {
	expect(slug('  Red, ripe apple! ')).toBe('red-ripe-apple');
});
