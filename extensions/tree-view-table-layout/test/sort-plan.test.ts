import { describe, expect, test } from 'bun:test';
import { planSortMoves, type SortMove } from '../src/sort-plan';

/**
 * What Directus's `/utils/sort` does with a move: the item takes the target's place and only the
 * items between shift, so moving down lands it after the target and moving up lands it before
 */
function apply(order: string[], moves: SortMove[]) {
	const list = [...order];
	for (const { item, to } of moves) {
		const down = list.indexOf(item as string) < list.indexOf(to as string);
		list.splice(list.indexOf(item as string), 1);
		list.splice(list.indexOf(to as string) + (down ? 1 : 0), 0, item as string);
	}
	return list;
}

/** The fewest moves: everything outside the longest run already in order */
function fewest(current: string[], desired: string[]) {
	const at = desired.map((id) => current.indexOf(id));
	const runs = at.map(() => 1);
	at.forEach((value, i) => {
		for (let j = 0; j < i; j++) if (at[j]! < value) runs[i] = Math.max(runs[i]!, runs[j]! + 1);
	});
	return desired.length - Math.max(0, ...runs);
}

describe('planSortMoves', () => {
	test('nothing to do when the order already holds', () => {
		expect(planSortMoves(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([]);
	});

	test('one item moved is one move', () => {
		expect(planSortMoves(['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a'])).toEqual([{ item: 'a', to: 'd' }]);
		expect(planSortMoves(['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'c'])).toEqual([{ item: 'd', to: 'a' }]);
	});

	test('items missing from either side are left out', () => {
		const moves = planSortMoves(['a', 'x', 'b', 'c'], ['c', 'b', 'a', 'y']);
		expect(apply(['a', 'x', 'b', 'c'], moves).filter((id) => id !== 'x')).toEqual(['c', 'b', 'a']);
	});

	test('any order, in the fewest moves /utils/sort can make it with', () => {
		let seed = 1;
		const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
		for (let run = 0; run < 300; run++) {
			const current = Array.from({ length: 1 + Math.floor(random() * 12) }, (_, i) => `n${i}`);
			const desired = [...current].sort(() => random() - 0.5);
			const moves = planSortMoves(current, desired);
			expect(apply(current, moves)).toEqual(desired);
			expect(moves).toHaveLength(fewest(current, desired));
		}
	});
});
