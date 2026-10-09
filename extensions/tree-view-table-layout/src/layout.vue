<!-- eslint-disable perfectionist/sort-named-imports -->
<script setup lang="ts">
import type { ShowSelect } from '@directus/extensions';
import type { Field, Filter, Item, PrimaryKey } from '@directus/types';
import type { ComponentPublicInstance, Ref } from 'vue';
// CORE CLONES
import type { Component } from 'vue';
import type { HeaderRaw } from '@polyhierarchies/ui/table';
import type { AliasFields } from './core-clones/composables/use-alias-fields';
import type { Collection } from './core-clones/types/collections';
import type { TreeEdits } from './types';
// CORE CHANGES
// import { useSync } from '@directus/composables';
// import { useCollectionPermissions } from '@/composables/use-permissions';
import { useSync } from '@directus/extensions-sdk';
import {
	inject,
	nextTick,
	onBeforeUnmount,
	onMounted,
	provide,
	ref,
	resolveComponent,
	resolveDirective,
	toRefs,
	watch,
	computed,

} from 'vue';
import { useI18n } from 'vue-i18n';
// CUSTOMIZED TABLE COMPONENT
import type { Graph } from '@polyhierarchies/core';
import { TreeTable as CustomVTable, tableKitKey } from '@polyhierarchies/ui/table';
import { useAliasFields } from './core-clones/composables/use-alias-fields';
import { usePageSize } from './core-clones/composables/use-page-size';
import { useShortcut } from './core-clones/composables/use-shortcut';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
	selection: () => [],
	showSelect: 'none',
	error: null,
	itemCount: undefined,
	tableSort: undefined,
	primaryKeyField: undefined,
	info: undefined,
	sortField: undefined,
	filterUser: undefined,
	search: undefined,
	onAlignChange: () => {},
});

const emit = defineEmits([
	'update:selection',
	'update:tableHeaders',
	'update:limit',
	'update:fields',
]);

interface Props {
	collection: string;
	selection?: Item[];
	readonly: boolean;
	tableHeaders: HeaderRaw[];
	showSelect?: ShowSelect;
	items: Item[];
	loading: boolean;
	error?: any;
	totalPages: number;
	tableSort?: { by: string; desc: boolean } | null;
	onRowClick: ({ item, event }: { item: Item; event: PointerEvent }) => void;
	tableRowHeight: number;
	page: number;
	toPage: (newPage: number) => void;
	itemCount?: number;
	fields: string[];
	limit: number;
	primaryKeyField?: Field;
	info?: Collection;
	sortField?: string;
	resetPresetAndRefresh: () => Promise<void>;
	clearFilters?: () => void;
	selectAll: () => void;
	filterUser?: Filter;
	search?: string;
	aliasedFields: Record<string, AliasFields>;
	aliasedKeys: string[];
	onSortChange: (newSort: { by: string; desc: boolean }) => void;
	onAlignChange?: (field: 'string', align: 'left' | 'center' | 'right') => void;
	parentField: string | null;
	hierarchy: 'taxonomy' | 'polyhierarchy';
	junction: string | null;
	/** The hierarchy, built by the layout's setup from the parent field or the junction's links */
	graph: Graph | null;
	/** A polyhierarchy orders by its links' own sort, so rows can be dragged however this is sorted */
	manualOrder: boolean;
	nodeLabel: (id: string) => string;
	/** While searching or filtering: the nodes that match, which the table highlights in the tree */
	matches: Set<string> | null;
	/** Sorted by a column rather than by the hierarchy: siblings in that order, nothing to drag */
	columnSorted: boolean;
	/** Nested, but not draggable: sorted by a column, or a taxonomy with no sort field */
	treeReadonly: boolean;
	/** How highlights show, from the search's or the filter's mode */
	highlightMode: 'routes' | 'inplace';
	/** Searching, rather than only filtering: what the hints call the highlights */
	searching: boolean;
	/** Hide layers: only these nodes stay, with what holds their place */
	keep: Set<string> | null;
	/** Drawn as a tree, so loaded whole: no pages, and no page size to choose */
	treeActive: boolean;
	/** The column the hierarchy indents, by key; `$controls` for none */
	treeColumn: string;
	showGuides: boolean;
	openDepth: number | null;
	maxOpenDepth: number | null;
	saveEdits: (edits: TreeEdits) => void;
	setShowing: (counts: { items: number; matching: number } | null) => void;
	/** Which match the table last went to, for the top bar's button, and that button's asking */
	setMatchPosition: (position: { at: number | null; of: number }) => void;
	matchJump: { step: 1 | -1; n: number } | null;
	/** What a click on a row does; in a picker a click always picks, as Directus has it */
	rowClick: 'opens' | 'selects';
	selectMode?: boolean;
	setCursor: (row: Item | null) => void;
	/** The links couldn't be read (no permission) or loaded */
	linksError: 'forbidden' | 'failed' | null;
	/** The selected row's actions, drawn after its name when a click selects */
	cursorNode?: string | null;
	cursorParent?: string | null;
	canLink?: boolean;
	canUnlink?: boolean;
	canReparent?: boolean;
	openCursor?: () => void;
	pickerFilter?: (role: 'parent' | 'child' | 'reparent') => Filter | null;
	linkCursor?: (role: 'parent' | 'child', picked: PrimaryKey[]) => Promise<void>;
	unlinkCursor?: () => Promise<void>;
	reparentCursor?: (parent: PrimaryKey | null) => Promise<void>;
	isFiltered: boolean;
}

const { t } = useI18n();

// The shared table is drawn with Directus's own checkbox, icons, menu and tooltips
provide(tableKitKey, {
	VCheckbox: resolveComponent('v-checkbox') as Component,
	VIcon: resolveComponent('v-icon') as Component,
	VMenu: resolveComponent('v-menu') as Component,
	VTextOverflow: resolveComponent('v-text-overflow') as Component,
	VProgressLinear: resolveComponent('v-progress-linear') as Component,
	ValueNull: resolveComponent('value-null') as Component,
	vTooltip: resolveDirective('tooltip')!,
	t: (key: string) => t(key),
	// Directus keeps an empty holder in its menu outlet for every menu, filled while it's open
	escapeTaken: () =>
		!!document.querySelector('#dialog-outlet > *')
		|| [...document.querySelectorAll('#menu-outlet > *')].some((menu) => menu.childElementCount > 0),
});
const { collection } = toRefs(props);

/**
 * The hierarchy as a graph, for the table to draw by placement: here each item names its one parent,
 * so every node has one placement, but the table draws a node with several the same way.
 */


// CORE CHANGE
const system = inject<Record<string, any>>('system')!;

// CORE CHANGES
const { sortAllowed, linksEditable } = useCollectionPermissions(collection);

/**
 * Why the drag handles went: sorted by a column, siblings come in that order, and a drag would have
 * nowhere sensible to put a row. Only said where rows could be dragged in the hierarchy's own order;
 * where they never could, a column sort is just a sort, and the header already shows it.
 */
const hierarchyHint = computed(() => {
	if (!props.graph || props.isFiltered || !props.columnSorted)
		return null;
	const draggable = props.hierarchy === 'polyhierarchy' ? linksEditable.value : sortAllowed.value;
	return draggable
		? 'Items are in the order of the column you sorted by. To drag them into place, sort by the hierarchy again.'
		: null;
});

function showHierarchy() {
	props.onSortChange(props.sortField ? { by: props.sortField, desc: false } : null);
}

function useCollectionPermissions(collection: Ref<string>) {
	const { usePermissionsStore, useUserStore } = system.stores;
	const permissionsStore = usePermissionsStore();
	const userStore = useUserStore();

	const sortAllowed = computed(() => {
		if (!collection.value || !props.sortField) return false;

		if (userStore.isAdmin) return true;

		const permission = permissionsStore.getPermission(collection.value, 'update');
		if (!permission) return false;

		if (!permission.fields) return false;
		return permission.fields.includes('*') || permission.fields.includes(props.sortField);
	});

	/** In a polyhierarchy, dragging edits the links, so it's the junction's permissions that count */
	const linksEditable = computed(() => {
		if (!props.junction) return false;
		if (userStore.isAdmin) return true;
		return !!permissionsStore.getPermission(props.junction, 'update') || !!permissionsStore.getPermission(props.junction, 'create');
	});

	return { sortAllowed, linksEditable };
}

const selectionWritable = useSync(props, 'selection', emit);
const tableHeadersWritable = useSync(props, 'tableHeaders', emit);
const limitWritable = useSync(props, 'limit', emit);

const mainElement = inject<Ref<Element | undefined>>('main-element');

const table = ref<ComponentPublicInstance & { goToMatch?: (step: 1 | -1) => void; focusTable?: () => void; pickCursor?: () => boolean; unfoldCursor?: () => void }>();

/** Picking more parents or children for the selected row, or a taxonomy's new parent, in Directus's own drawer */
const picking = ref<'parent' | 'child' | 'reparent' | null>(null);
function onPicked(keys: PrimaryKey[]) {
	const role = picking.value;
	picking.value = null;
	if (role === 'reparent') {
		void props.reparentCursor?.(keys[0] ?? null);
		return;
	}
	// Opened, so new children show as they land
	if (role === 'child' && keys.length)
		table.value?.unfoldCursor?.();
	if (role)
		void props.linkCursor?.(role, keys);
}
const named = (id: string | null | undefined) => (id ? props.nodeLabel(id) : '');
const layoutRoot = ref<HTMLElement>();

// The top bar's Next: go to the match and hand the table the keys, so the arrows carry on from it
watch(() => props.matchJump, (jump) => {
	if (!jump)
		return;
	table.value?.goToMatch?.(jump.step);
	table.value?.focusTable?.();
});

/**
 * The search box Directus draws for this view: the drawer's, when picking items, else the one in the
 * page's header (not, say, a navigation's own search box), but not while a drawer covers the page.
 * Several drawers, only the top one's. Only drawers showing count: a closed one can stay in the page.
 */
function ownSearch() {
	const drawers = [...document.querySelectorAll('.v-drawer')].filter((each) => each.getClientRects().length > 0);
	const drawer = layoutRoot.value?.closest('.v-drawer') ?? null;
	if (drawer ? drawer !== drawers.at(-1) : drawers.length)
		return null;
	const boxes = [...(drawer ?? document).querySelectorAll<HTMLElement>('.search-input')]
		.filter((box) => (box.closest('.v-drawer') ?? null) === drawer);
	return boxes.find((box) => box.closest('.header-bar')) ?? boxes[0] ?? null;
}

/** Opened and focused with its text selected, as a find box is; folded away when empty, it opens on a click */
async function focusSearch(box: HTMLElement) {
	const input = box.querySelector('input');
	if (!input)
		return;
	if (!input.offsetWidth) {
		box.querySelector<HTMLElement>('.icon-search')?.click();
		await nextTick();
	}
	input.focus();
	input.select();
}

/**
 * Enter in the search goes to the next match (Shift+Enter, the one before) and selects it; Esc then
 * leaves the search for the table, where the arrow keys carry on from it. ⌘/Ctrl-F focuses the
 * search, as the browser's find can't see the rows drawn without their cells; pressed again from the
 * search, it's the browser's. Picking items, ⌘/Ctrl+Enter takes the selected row and saves.
 */
let pendingStep: 1 | -1 | null = null;
let pendingGiveUp: ReturnType<typeof setTimeout> | undefined;
function onKeydown(event: KeyboardEvent) {
	const box = ownSearch();
	const input = box?.querySelector('input');
	if (!box || !input)
		return;
	if (props.selectMode && event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing) {
		const save = layoutRoot.value?.closest('.v-drawer')?.querySelector<HTMLElement>('.header-bar .header-button:not(.close-button) button');
		if (!save)
			return;
		event.preventDefault();
		event.stopPropagation();
		// Nothing selected or ticked, nothing's saved: in a taxonomy that would move the item to the top
		if (table.value?.pickCursor?.() || props.selection?.length)
			void nextTick(() => save.click());
		return;
	}
	// With nothing in the search there's nothing to go to: Enter is left alone
	if (event.key === 'Enter' && event.target === input && !event.isComposing && input.value.trim()) {
		event.preventDefault();
		const step = event.shiftKey ? -1 : 1;
		// Typed faster than the search follows: go once its matches arrive
		if (input.value.trim() !== (props.search ?? '').trim()) {
			pendingStep = step;
			clearTimeout(pendingGiveUp);
			pendingGiveUp = setTimeout(() => (pendingStep = null), 3000);
		}
		else {
			table.value?.goToMatch?.(step);
		}
	}
	else if (event.key === 'Escape' && event.target === input && table.value?.focusTable) {
		event.preventDefault();
		// Or the drawer's Esc would close it, rather than go one step back
		if (layoutRoot.value?.closest('.v-drawer'))
			event.stopPropagation();
		input.blur();
		table.value.focusTable();
	}
	else if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'f') {
		if (document.activeElement === input)
			return;
		event.preventDefault();
		void focusSearch(box);
	}
}
watch([() => props.matches, () => props.keep], async () => {
	if (pendingStep === null)
		return;
	const step = pendingStep;
	pendingStep = null;
	await nextTick();
	table.value?.goToMatch?.(step);
});

onMounted(() => {
	// Capturing on the window, before anything on the way down can keep the key to itself
	window.addEventListener('keydown', onKeydown, true);
	// Opened to pick items: ready to type into, once the drawer has slid in. Directus starts a drawer
	// from the collection's saved view, last search and all: the filter is worth keeping, but the
	// search was for something else
	if (layoutRoot.value?.closest('.v-drawer')) {
		ownSearch()?.querySelector<HTMLElement>('.icon-clear')?.click();
		setTimeout(() => {
			const box = ownSearch();
			if (box)
				void focusSearch(box);
		}, 250);
	}
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true));

watch(
	() => props.page,
	() => mainElement?.value?.scrollTo({ top: 0, behavior: 'smooth' }),
);

useShortcut(
	'meta+a',
	() => {
		props.selectAll();
	},
	table,
);

const { sizes: pageSizes, selected: selectedSize } = usePageSize<string>(
	[25, 50, 100, 250, 500, 1000],
	String,
	props.limit,
	system,
);

if (limitWritable.value !== selectedSize) {
	limitWritable.value = selectedSize;
}

const fieldsWritable = useSync(props, 'fields', emit);

const { getFromAliasedItem } = useAliasFields(
	fieldsWritable,
	collection,
	system,
);

function addField(fieldKey: string) {
	fieldsWritable.value = [...fieldsWritable.value, fieldKey];
}

function removeField(fieldKey: string) {
	fieldsWritable.value = fieldsWritable.value.filter(
		(field) => field !== fieldKey,
	);
}
</script>

<template>
	<div
		ref="layoutRoot"
		class="custom-layout"
	>
		<v-notice
			v-if="linksError"
			class="hierarchy-hint"
			type="warning"
		>
			<template v-if="linksError === 'forbidden'">
				Your role can't read {{ junction }}, where this view's links are kept, so every item is shown at the top level. An admin can give your role read access to it.
			</template>
			<template v-else>
				The links in {{ junction }} couldn't be loaded, so every item is shown at the top level.
			</template>
		</v-notice>
		<v-notice
			v-if="hierarchyHint"
			class="hierarchy-hint"
			type="info"
		>
			<div class="hint-body">
				<span>{{ hierarchyHint }}</span>
				<v-button
					small
					@click="showHierarchy"
				>
					Sort by the hierarchy
				</v-button>
			</div>
		</v-notice>
		<CustomVTable
			v-if="loading || (itemCount && itemCount > 0 && !error)"
			ref="table"
			v-model="selectionWritable"
			v-model:headers="tableHeadersWritable"
			class="table"
			fixed-header
			:show-select="showSelect ? showSelect : selection !== undefined"
			show-resize
			must-sort
			:sort="tableSort"
			:items="items"
			:loading="loading"
			:row-height="tableRowHeight"
			:item-key="primaryKeyField?.field"
			:show-manual-sort="(manualOrder || treeActive ? (manualOrder ? linksEditable : sortAllowed) : sortAllowed && !isFiltered)"
			:manual-sort-key="sortField"
			allow-header-reorder
			selection-use-keys
			:graph
			:manual-order
			:node-label
			:matches
			:readonly="treeReadonly"
			:search-mode="highlightMode"
			:searching
			:keep
			:collection
			:tree-column="treeColumn === '$controls' ? null : treeColumn"
			:show-guides="showGuides"
			:open-depth="openDepth == null || openDepth < 0 ? null : openDepth"
			:max-open-depth="maxOpenDepth"
			:click-selects="rowClick === 'selects' && !selectMode"
			@click:row="onRowClick"
			@update:sort="onSortChange"
			@update:items="saveEdits"
			@showing="setShowing"
			@match-position="setMatchPosition"
			@cursor="setCursor"
		>
			<template
				v-for="header in tableHeaders"
				:key="header.value"
				#[`item.${header.value}`]="{ item }"
			>
				<render-display
					:value="getFromAliasedItem(item, header.value)"
					:display="header.field.display"
					:options="header.field.displayOptions"
					:interface="header.field.interface"
					:interface-options="header.field.interfaceOptions"
					:type="header.field.type"
					:collection="header.field.collection"
					:field="header.field.field"
				/>
			</template>

			<!-- Not while picking items: a click there picks -->
			<template
				v-if="!selectMode"
				#row-tools
			>
				<!-- Only where a click selects: elsewhere a click already opens -->
				<v-button
					v-if="rowClick === 'selects'"
					v-tooltip.bottom="`Open ${named(cursorNode)}, as a double-click or Enter does`"
					x-small
					icon
					secondary
					@click="openCursor"
				>
					<v-icon name="open_in_new" x-small />
				</v-button>
				<v-button
					v-if="canReparent"
					v-tooltip.bottom="`Reparent ${named(cursorNode)}: pick its new parent, or save with none picked to move it to the top level`"
					x-small
					icon
					secondary
					@click="picking = 'reparent'"
				>
					<v-icon name="drive_file_move" x-small />
				</v-button>
				<template v-if="canLink">
					<v-button
						v-tooltip.bottom="`Add a parent: pick items for ${named(cursorNode)} to go under as well`"
						x-small
						icon
						secondary
						@click="picking = 'parent'"
					>
						<v-icon name="add_row_above" x-small />
					</v-button>
					<v-button
						v-tooltip.bottom="`Add children: pick items to go inside ${named(cursorNode)} as well as where they are`"
						x-small
						icon
						secondary
						@click="picking = 'child'"
					>
						<v-icon name="add_row_below" x-small />
					</v-button>
				</template>
				<v-button
					v-if="canUnlink && cursorParent"
					v-tooltip.bottom="`Take ${named(cursorNode)} out of ${named(cursorParent)}. It stays under any other parents, and at the top level if this was its only one`"
					x-small
					icon
					secondary
					@click="unlinkCursor"
				>
					<v-icon name="link_off" x-small />
				</v-button>
			</template>

			<template #header-context-menu="{ header }">
				<v-list>
					<v-list-item
						:disabled="!header.sortable"
						:active="
							tableSort?.by === header.value && tableSort?.desc === false
						"
						clickable
						@click="onSortChange({ by: header.value, desc: false })"
					>
						<v-list-item-icon>
							<v-icon name="sort" class="flip" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t("sort_asc") }}
						</v-list-item-content>
					</v-list-item>

					<v-list-item
						:active="tableSort?.by === header.value && tableSort?.desc === true"
						:disabled="!header.sortable"
						clickable
						@click="onSortChange({ by: header.value, desc: true })"
					>
						<v-list-item-icon>
							<v-icon name="sort" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t("sort_desc") }}
						</v-list-item-content>
					</v-list-item>

					<v-divider />

					<v-list-item
						:active="header.align === 'left'"
						clickable
						@click="onAlignChange?.(header.value, 'left')"
					>
						<v-list-item-icon>
							<v-icon name="format_align_left" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t("left_align") }}
						</v-list-item-content>
					</v-list-item>
					<v-list-item
						:active="header.align === 'center'"
						clickable
						@click="onAlignChange?.(header.value, 'center')"
					>
						<v-list-item-icon>
							<v-icon name="format_align_center" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t("center_align") }}
						</v-list-item-content>
					</v-list-item>
					<v-list-item
						:active="header.align === 'right'"
						clickable
						@click="onAlignChange?.(header.value, 'right')"
					>
						<v-list-item-icon>
							<v-icon name="format_align_right" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t("right_align") }}
						</v-list-item-content>
					</v-list-item>

					<v-divider />

					<v-list-item
						:active="header.align === 'right'"
						clickable
						@click="removeField(header.value)"
					>
						<v-list-item-icon>
							<v-icon name="remove" />
						</v-list-item-icon>
						<v-list-item-content>
							{{ t("hide_field") }}
						</v-list-item-content>
					</v-list-item>
				</v-list>
			</template>

			<template #header-append>
				<v-menu
					placement="bottom-end"
					show-arrow
					:close-on-content-click="false"
				>
					<template #activator="{ toggle, active }">
						<v-icon
							v-tooltip="t('add_field')"
							class="add-field"
							name="add"
							:class="{ active }"
							clickable
							@click="toggle"
						/>
					</template>

					<v-field-list
						:collection="collection"
						:disabled-fields="fields"
						:allow-select-all="false"
						@add="addField($event[0])"
					/>
				</v-menu>
			</template>

			<template #footer>
				<div class="footer">
					<div class="pagination">
						<v-pagination
							v-if="!treeActive && totalPages > 1"
							:length="totalPages"
							:total-visible="7"
							show-first-last
							:model-value="page"
							@update:model-value="toPage"
						/>
					</div>

					<div
						v-if="
							loading === false
								&& !treeActive
								&& limit > -1
								&& (items.length >= 25 || limit < 25)
						"
						class="per-page"
					>
						<span>{{ t("per_page") }}</span>
						<v-select
							:model-value="`${limit}`"
							:items="pageSizes"
							inline
							@update:model-value="limitWritable = +$event"
						/>
					</div>
				</div>
			</template>
		</CustomVTable>
		<drawer-collection
			v-if="picking"
			active
			:collection="collection"
			:multiple="picking !== 'reparent'"
			:selection="[]"
			:filter="pickerFilter?.(picking) ?? undefined"
			@input="onPicked"
			@update:active="picking = null"
		/>

		<slot
			v-else-if="error"
			name="error"
			:error="error"
			:reset="resetPresetAndRefresh"
		/>
		<slot
			v-else-if="itemCount === 0 && (filterUser || search)"
			name="no-results"
		/>
		<slot v-else-if="itemCount === 0" name="no-items" />
	</div>
</template>

<style lang="scss" scoped>
.custom-layout {
	display: contents;
	margin: var(--content-padding);
	margin-bottom: var(--content-padding-bottom);
}

.hierarchy-hint {
	/* The table's own edges (see `table.has-controls` below): it starts a chevron's width into the
	   gutter, so a notice inset by the gutter both sides started further in and ran past its end */
	box-sizing: border-box;
	width: calc(100% - var(--content-padding) * 2);
	margin: 16px 0 16px max(0px, calc(var(--content-padding) - 28px));

	/* Its own element, not the notice's inner ones, which change between Directus versions */
	.hint-body {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		align-items: center;
		justify-content: space-between;
	}
}

.v-table {
	--v-table-sticky-offset-top: var(--layout-offset-top);

	display: contents;

	& > :deep(table) {
		min-width: calc(100% - var(--content-padding) * 2) !important;
		margin-inline: var(--content-padding);
	}

	/* A nesting table's chevrons hang in the page gutter, so the handles sit where Directus's own
	   tables put them rather than a chevron's width further in. A flat one's handles take the
	   chevrons' place, or the gutter looks twice as wide as the content beside it. Never less
	   than the edge, where the gutter is narrower than a chevron. */
	& > :deep(table.has-controls) {
		margin-inline-start: max(0px, calc(var(--content-padding) - 28px));
	}
}

.footer {
	position: sticky;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: 32px var(--content-padding);

	.pagination {
		display: inline-block;
	}

	.per-page {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		width: 240px;
		color: var(--theme--foreground-subdued);

		span {
			width: auto;
			margin-right: 4px;
		}

		.v-select {
			color: var(--theme--foreground);
		}
	}
}

.add-field {
	--v-icon-color-hover: var(--theme--foreground);

	&.active {
		--v-icon-color: var(--theme--foreground);
	}
}

.flip {
	transform: scaleY(-1);
}
</style>
