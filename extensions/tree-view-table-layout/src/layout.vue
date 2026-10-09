<!-- eslint-disable perfectionist/sort-named-imports -->
<script setup lang="ts">
import type { ShowSelect } from '@directus/extensions';
import type { Field, Filter, Item } from '@directus/types';
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
	/** Nested, but not draggable: while searching, or sorted by a column */
	treeReadonly: boolean;
	/** How highlights show, from the search's or the filter's mode */
	highlightMode: 'routes' | 'inplace';
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
 * Why rows can't be dragged right now. The tree stays while searching (the matches are highlighted
 * in it) and while sorted by a column (siblings come in that order), but a drag would have nowhere
 * sensible to put a row, so it waits for the hierarchy's own order.
 */
const hierarchyHint = computed(() => {
	if (!props.graph || props.isFiltered)
		return null;
	if (props.columnSorted)
		return 'Sorted by a column: siblings are in that order, and rows can\'t be dragged into place until it\'s sorted by the hierarchy again.';
	return null;
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

const table = ref<ComponentPublicInstance & { goToMatch?: (step: 1 | -1) => void }>();
const layoutRoot = ref<HTMLElement>();

watch(() => props.matchJump, (jump) => jump && table.value?.goToMatch?.(jump.step));

/**
 * The search box Directus draws for this view: the drawer's, when picking items, else the page's,
 * but not while a drawer covers the page. Several drawers, only the top one's.
 */
function ownSearch() {
	const drawers = [...document.querySelectorAll('.v-drawer')];
	const drawer = layoutRoot.value?.closest('.v-drawer');
	if (drawer ? drawer !== drawers.at(-1) : drawers.length)
		return null;
	return (drawer ?? document).querySelector<HTMLElement>('.search-input');
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
 * Enter in the search goes to the next match (Shift+Enter, the one before). ⌘/Ctrl-F focuses the
 * search, as the browser's find can't see the rows drawn without their cells; pressed again from the
 * search, it's the browser's.
 */
let pendingStep: 1 | -1 | null = null;
let pendingGiveUp: ReturnType<typeof setTimeout> | undefined;
function onKeydown(event: KeyboardEvent) {
	const box = ownSearch();
	const input = box?.querySelector('input');
	if (!box || !input)
		return;
	if (event.key === 'Enter' && event.target === input && !event.isComposing) {
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
	document.addEventListener('keydown', onKeydown);
	// Opened to pick items: ready to type into, once the drawer has slid in
	if (layoutRoot.value?.closest('.v-drawer')) {
		setTimeout(() => {
			const box = ownSearch();
			if (box)
				void focusSearch(box);
		}, 250);
	}
});
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));

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
			:keep
			:collection
			:tree-column="treeColumn === '$controls' ? null : treeColumn"
			:show-guides="showGuides"
			:open-depth="openDepth == null || openDepth < 0 ? null : openDepth"
			:max-open-depth="maxOpenDepth"
			@click:row="onRowClick"
			@update:sort="onSortChange"
			@update:items="saveEdits"
			@showing="setShowing"
			@match-position="setMatchPosition"
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
