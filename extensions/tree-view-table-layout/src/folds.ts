import type { PrimaryKey } from '@directus/types';
import { useLocalStorage } from '@vueuse/core';

/**
 * The items you've folded or unfolded yourself, where they differ from the view's starting depth
 * (`openDepth`, in the layout options, so a team's preset can set it). Kept in this browser rather
 * than the preset, or every click would leave a bookmark with unsaved changes. Local rather than
 * session storage, so folds last beyond the tab, as the layout's options do. The table and the
 * sidebar's reset each call this, and share the one store.
 */
export function useFolds(collection: string) {
	const key = `${collection}--tree-view-folds`;
	const legacyKey = `${collection}--tree-view-collapsed-items`;

	// Before the starting depth, only folded items were stored
	let initial: Record<string, boolean> = {};
	try {
		const legacy = localStorage.getItem(legacyKey);
		if (legacy && localStorage.getItem(key) === null) {
			initial = Object.fromEntries((JSON.parse(legacy) as PrimaryKey[]).map((id) => [id, true]));
			localStorage.removeItem(legacyKey);
		}
	}
	catch {}

	const folds = useLocalStorage<Record<string, boolean>>(key, initial);

	function reset() {
		folds.value = {};
	}

	return { folds, reset };
}
