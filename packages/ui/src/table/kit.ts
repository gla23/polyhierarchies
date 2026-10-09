import type { Component, Directive, InjectionKey } from 'vue';
import { inject } from 'vue';

/**
 * The few Directus pieces the table is drawn with. The Directus layout hands over Directus's own
 * (`resolveComponent('v-checkbox')` and so on); the playground hands over look-alikes styled with the
 * same `--theme--*` variables. Everything else in the table is shared markup and CSS, which is what
 * keeps the two looking the same. Named so `<v-checkbox>` in a template resolves to `VCheckbox`.
 */
export interface TableKit {
	VCheckbox: Component;
	VIcon: Component;
	VMenu: Component;
	VTextOverflow: Component;
	VProgressLinear: Component;
	ValueNull: Component;
	vTooltip: Directive;
	/** Directus's translations, by key: `loading`, `no_items`, `toggle_manual_sorting`, … */
	t: (key: string) => string;
	/** Something open over the page that Esc closes first (a menu, a dialog), so the selected row stays */
	escapeTaken?: () => boolean;
}

export const tableKitKey: InjectionKey<TableKit> = Symbol('table-kit');

export function useTableKit(): TableKit {
	const kit = inject(tableKitKey, null);
	if (!kit) throw new Error('The tree table needs a TableKit: provide one with tableKitKey');
	return kit;
}
