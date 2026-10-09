import type { WritableComputedRef } from 'vue';
import { computed } from 'vue';

/** A prop as a writable ref that emits `update:<prop>`, as Directus's `useSync` does */
export function useSync<T extends object, K extends keyof T & string>(
	props: T,
	key: K,
	emit: (event: `update:${K}`, value: T[K]) => void
): WritableComputedRef<T[K]> {
	return computed({ get: () => props[key], set: (value) => emit(`update:${key}`, value) });
}
