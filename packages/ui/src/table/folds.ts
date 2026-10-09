import type { Ref } from 'vue';
import { ref, watch } from 'vue';

/** One store per collection for the whole page, so the table and the sidebar's reset see the same folds */
const stores = new Map<string, Ref<Record<string, boolean>>>();

/**
 * The placements you've folded or unfolded yourself, where they differ from the view's starting depth
 * (`openDepth`, in the layout options, so a team's preset can set it). Kept in this browser rather
 * than the preset, or every click would leave a bookmark with unsaved changes. Local rather than
 * session storage, so folds last beyond the tab, as the layout's options do. The table and the
 * sidebar's reset each call this, and share the one store.
 */
export function useFolds(collection: string) {
	// By placement now (a node with two parents folds separately in each), so a new key: the old
	// one held folds by item, which would land on the wrong rows
	const key = `${collection}--tree-view-placement-folds`;
	const shared = stores.get(key);
	if (shared) return { folds: shared, reset: () => (shared.value = {}) };

	let stored: Record<string, boolean> = {};
	try {
		stored = JSON.parse(localStorage.getItem(key) ?? 'null') ?? {};
	}
	catch {}
	const folds = ref<Record<string, boolean>>(stored);
	watch(folds, (value) => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		}
		catch {}
	}, { deep: true });
	stores.set(key, folds);

	function reset() {
		folds.value = {};
	}

	return { folds, reset };
}
