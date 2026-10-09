import type { Ref } from 'vue';
import { ref, watch } from 'vue';

export interface Folds {
	/**
	 * Everything folded or unfolded at once, open to this depth (null: all of it), in place of the
	 * view's starting depth. One number rather than an entry per row: unfolding a deep tree wrote one
	 * per row, each a whole route, half a megabyte again with every fold after.
	 */
	depth?: number | null;
	/** Each placement folded (true) or unfolded (false) where that differs from the depth */
	rows: Record<string, boolean>;
}

/** One store per collection for the whole page, so the table and the sidebar's reset see the same folds */
const stores = new Map<string, Ref<Folds>>();

/**
 * The placements you've folded or unfolded yourself, where they differ from the view's starting depth
 * (`openDepth`, in the layout options, so a team's preset can set it). Kept in this browser rather
 * than the preset, or every click would leave a bookmark with unsaved changes. Local rather than
 * session storage, so folds last beyond the tab, as the layout's options do. The table and the
 * sidebar's reset each call this, and share the one store.
 */
export function useFolds(collection: string) {
	// A new key for each new shape, as the old would land on the wrong rows or be misread
	const key = `${collection}--tree-view-folds`;
	const shared = stores.get(key);
	if (shared) return { folds: shared, reset: () => (shared.value = { rows: {} }) };

	let stored: Folds = { rows: {} };
	try {
		localStorage.removeItem(`${collection}--tree-view-placement-folds`);
		const parsed = JSON.parse(localStorage.getItem(key) ?? 'null');
		if (parsed && typeof parsed.rows === 'object') stored = parsed;
	}
	catch {}
	const folds = ref<Folds>(stored);
	// Every change replaces the folds whole
	watch(folds, (value) => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		}
		catch {}
	});
	stores.set(key, folds);

	function reset() {
		folds.value = { rows: {} };
	}

	return { folds, reset };
}
