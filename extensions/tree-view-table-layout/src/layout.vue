<!-- eslint-disable perfectionist/sort-named-imports -->
<script setup lang="ts">
import type { ShowSelect } from '@directus/extensions';
import type { Field, Filter, Item } from '@directus/types';
import type { ComponentPublicInstance, Ref } from 'vue';
// CORE CLONES
import type { HeaderRaw } from './core-clones/components/v-table/types';
import type { AliasFields } from './core-clones/composables/use-alias-fields';
import type { Collection } from './core-clones/types/collections';
import type { TreeEdits } from './types';
// CORE CHANGES
// import { useSync } from '@directus/composables';
// import { useCollectionPermissions } from '@/composables/use-permissions';
import { useSync } from '@directus/extensions-sdk';
import {
	inject,
	ref,
	toRefs,
	watch,
	computed,

} from 'vue';
import { useI18n } from 'vue-i18n';
// CUSTOMIZED TABLE COMPONENT
import CustomVTable from './components/v-table.vue';
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
	shiftedColumns: number;
	showGuides: boolean;
	openDepth: number | null;
	saveEdits: (edits: TreeEdits) => void;
	isFiltered: boolean;
}

const { t } = useI18n();
const { collection } = toRefs(props);

// CORE CHANGE
const system = inject<Record<string, any>>('system')!;

// CORE CHANGES
const { sortAllowed } = useCollectionPermissions(collection);

/**
 * Why a collection with a parent field is showing flat. The hierarchy only shows while sorting
 * manually, which isn't obvious, and not at all while searching or filtering, as a filtered list can
 * leave items without their parents.
 */
const hierarchyHint = computed(() => {
	if (!props.parentField || !props.sortField || !sortAllowed.value)
		return null;
	if (props.isFiltered)
		return "The hierarchy can't be displayed while searching or filtering.";
	if (props.tableSort?.by !== props.sortField)
		return "You are sorting by another column, so the hierarchy is hidden and items can't be dragged into place.";
	return null;
});

function showHierarchy() {
	if (props.isFiltered)
		props.clearFilters?.();
	if (props.sortField)
		props.onSortChange({ by: props.sortField, desc: false });
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

	return { sortAllowed };
}

const selectionWritable = useSync(props, 'selection', emit);
const tableHeadersWritable = useSync(props, 'tableHeaders', emit);
const limitWritable = useSync(props, 'limit', emit);

const mainElement = inject<Ref<Element | undefined>>('main-element');

const table = ref<ComponentPublicInstance>();

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
	<div class="custom-layout">
		<v-notice
			v-if="hierarchyHint"
			class="hierarchy-hint"
			type="info"
		>
			<div class="hint-body">
				<span>{{ hierarchyHint }}</span>
				<v-button
					v-if="!isFiltered || clearFilters"
					small
					@click="showHierarchy"
				>
					View hierarchy
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
			:show-manual-sort="sortAllowed && !isFiltered"
			:manual-sort-key="sortField"
			allow-header-reorder
			selection-use-keys
			:parent-field
			:collection
			:shifted-columns="shiftedColumns"
			:show-guides="showGuides"
			:open-depth="openDepth"
			@click:row="onRowClick"
			@update:sort="onSortChange"
			@update:items="saveEdits"
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
							v-if="totalPages > 1"
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
