import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import type { Graph } from '@polyhierarchies/core';

/** Whether `key` is down. Cleared when the window loses focus, so an Alt-Tab can't leave it stuck. */
export function useKeyHeld(key: string) {
	const held = ref(false);
	const down = (event: KeyboardEvent) => event.key === key && (held.value = true);
	const up = (event: KeyboardEvent) => event.key === key && (held.value = false);
	const release = () => (held.value = false);
	onMounted(() => {
		window.addEventListener('keydown', down);
		window.addEventListener('keyup', up);
		window.addEventListener('blur', release);
	});
	onBeforeUnmount(() => {
		window.removeEventListener('keydown', down);
		window.removeEventListener('keyup', up);
		window.removeEventListener('blur', release);
	});
	return held;
}

/**
 * Zotero's trick: hold Alt and everything the focus lives in lights up, wherever it is in the view.
 * The cheapest way to answer "where else is this?" without opening anything.
 */
export function useHomesOfFocus(graph: Ref<Graph>, focus: Ref<string | null>) {
	const held = useKeyHeld('Alt');
	return computed(() => {
		const id = focus.value;
		if (!held.value || !id || !graph.value.data.nodes.some((node) => node.id === id))
			return new Set<string>();
		return new Set(graph.value.parents(id));
	});
}
