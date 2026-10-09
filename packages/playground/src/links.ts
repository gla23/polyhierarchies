import type { InjectionKey } from 'vue';

/** Everything the address bar can say about the playground */
export interface PlaygroundState {
	page?: string;
	data?: string;
	ui?: string;
	focus?: string | null;
	/** The UI's options that differ from their defaults, under their own keys */
	options?: Record<string, string | number>;
	mode?: 'view' | 'edit';
	/** Parents below: the graph drawn upside down */
	dir?: 'down' | 'up';
	/** A page's own settings, such as the node Every path opens on */
	query?: Record<string, string>;
}

/** The address for a state of the playground: what the pages link to and the address bar shows */
export function playgroundHref(state: PlaygroundState) {
	const query = new URLSearchParams();
	if (state.page && state.page !== 'explore' && state.page !== 'intro') query.set('page', state.page);
	if (state.data) query.set('data', state.data);
	if (state.ui) query.set('ui', state.ui);
	if (state.focus) query.set('focus', state.focus);
	if (state.mode === 'edit') query.set('mode', 'edit');
	if (state.dir === 'up') query.set('dir', 'up');
	for (const [key, value] of Object.entries(state.options ?? {})) query.set(key, String(value));
	for (const [key, value] of Object.entries(state.query ?? {})) query.set(key, value);
	return `?${query}`;
}

/** Follows a playground address in place rather than reloading the page; provided by App */
export const navigateKey: InjectionKey<(href: string) => void> = Symbol('navigate');
