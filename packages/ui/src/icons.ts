import { shallowReactive, type Component, type InjectionKey } from 'vue';

export interface IconData {
	body: string;
	viewBox: string;
}

/**
 * Where an icon name is drawn from. Standalone it's Iconify's public API; in the Directus admin,
 * whose CSP won't let the page fetch it, an extension provides its own renderer (a component taking
 * `name`) under this key instead.
 */
export const iconRendererKey: InjectionKey<Component> = Symbol('iconRenderer');

/** `prefix:name`, or a bare Material Symbols name meaning its outlined version */
function candidates(name: string): [prefix: string, names: string[]] {
	const separator = name.indexOf(':');
	if (separator !== -1) return [name.slice(0, separator), [name.slice(separator + 1)]];
	const hyphenated = name.replace(/_/g, '-');
	return ['material-symbols', [`${hyphenated}-outline`, hyphenated]];
}

interface IconifyResponse {
	width?: number;
	height?: number;
	icons: Record<string, { body: string; width?: number; height?: number }>;
	aliases?: Record<string, { parent: string }>;
}

/** Resolved icons, reactive so every NodeIcon waiting on one fills in when it lands */
export const icons = shallowReactive(new Map<string, IconData | null>());
const queued = new Map<string, Set<string>>();

/** Batched: every icon asked for in one tick goes in a single request per set */
export function requestIcon(name: string) {
	if (icons.has(name)) return;
	icons.set(name, null);
	const [prefix] = candidates(name);
	const batch = queued.get(prefix);
	if (batch) return void batch.add(name);
	queued.set(prefix, new Set([name]));
	queueMicrotask(() => fetchBatch(prefix));
}

async function fetchBatch(prefix: string) {
	const names = [...queued.get(prefix)!];
	queued.delete(prefix);
	const wanted = names.flatMap((name) => candidates(name)[1]);
	try {
		const response = await fetch(`https://api.iconify.design/${prefix}.json?icons=${wanted.join(',')}`);
		const data: IconifyResponse = await response.json();
		for (const name of names) {
			const found = candidates(name)[1]
				.map((candidate) => data.icons[candidate] ?? data.icons[data.aliases?.[candidate]?.parent ?? ''])
				.find(Boolean);
			if (found)
				icons.set(name, {
					body: found.body,
					viewBox: `0 0 ${found.width ?? data.width ?? 24} ${found.height ?? data.height ?? 24}`
				});
		}
	} catch {
		// Offline: the icons stay blank, which is what a missing icon looks like anyway
	}
}
