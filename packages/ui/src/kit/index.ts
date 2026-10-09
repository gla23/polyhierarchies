import type { Directive } from 'vue';
import type { TableKit } from '../table/kit';
import KitCheckbox from './KitCheckbox.vue';
import KitIcon from './KitIcon.vue';
import KitMenu from './KitMenu.vue';
import KitProgress from './KitProgress.vue';
import KitTextOverflow from './KitTextOverflow.vue';
import KitValueNull from './KitValueNull.vue';

/** Directus's tooltips, as the browser's own: the text in a title */
const tooltip: Directive<HTMLElement, string | null | undefined> = {
	mounted: (el, { value }) => (el.title = value ?? ''),
	updated: (el, { value }) => (el.title = value ?? '')
};

/** Directus's English, for the keys the table asks for */
const english: Record<string, string> = {
	loading: 'Loading…',
	no_items: 'No items',
	toggle_manual_sorting: 'Toggle manual sorting',
	sort_asc: 'Sort ascending',
	sort_desc: 'Sort descending',
	disable_sort: 'Disable sort'
};

/** The look-alikes the playground draws the shared table with, outside Directus */
export const playgroundTableKit: TableKit = {
	VCheckbox: KitCheckbox,
	VIcon: KitIcon,
	VMenu: KitMenu,
	VTextOverflow: KitTextOverflow,
	VProgressLinear: KitProgress,
	ValueNull: KitValueNull,
	vTooltip: tooltip,
	t: (key) => english[key] ?? key
};
