import type { PrimaryKey } from '@directus/types';

export interface SortMove {
	item: PrimaryKey;
	to: PrimaryKey;
}

/**
 * The fewest moves for Directus's `/utils/sort` that turn the `current` order into `desired`. Each
 * move takes the target's sort value and shifts only the values between, so moving down lands the
 * item after the target and moving up lands it before. The longest run already in order stays put,
 * and every other item goes, in the desired order, straight after the one it should follow.
 */
export function planSortMoves(current: PrimaryKey[], desired: PrimaryKey[]): SortMove[] {
	const inDesired = new Set(desired);
	const list = current.filter((id) => inDesired.has(id));
	const inList = new Set(list);
	const wanted = desired.filter((id) => inList.has(id));

	const index = new Map(list.map((id, i) => [id, i]));
	const kept = longestIncreasing(wanted.map((id) => index.get(id)!)).map((i) => list[i]!);
	const keep = new Set(kept);

	const moves: SortMove[] = [];
	wanted.forEach((id, i) => {
		if (keep.has(id))
			return;
		const from = list.indexOf(id);
		const previous = wanted[i - 1];
		let to: PrimaryKey | undefined;
		if (previous === undefined) {
			to = from === 0 ? undefined : list[0];
		}
		else {
			const after = list.indexOf(previous);
			to = from < after ? previous : from === after + 1 ? undefined : list[after + 1];
		}
		if (to === undefined)
			return;
		moves.push({ item: id, to });
		list.splice(from, 1);
		const target = list.indexOf(to);
		list.splice(from <= target ? target + 1 : target, 0, id);
	});
	return moves;
}

/** Indices into `values` of a longest strictly increasing subsequence (patience sorting) */
function longestIncreasing(values: number[]): number[] {
	const tails: number[] = [];
	const previous: number[] = [];
	values.forEach((value, i) => {
		let low = 0;
		let high = tails.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if (values[tails[middle]!]! < value)
				low = middle + 1;
			else high = middle;
		}
		previous[i] = low > 0 ? tails[low - 1]! : -1;
		tails[low] = i;
	});
	const result: number[] = [];
	for (let i = tails.length ? tails[tails.length - 1]! : -1; i !== -1; i = previous[i]!)
		result.unshift(values[i]!);
	return result;
}
