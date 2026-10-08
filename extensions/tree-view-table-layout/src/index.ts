import type { Field, Filter, Item, PrimaryKey } from '@directus/types';
import type { ComputedRef, Ref } from 'vue';
import type { HeaderRaw, Sort } from './core-clones/components/v-table/types';
import type { LayoutOptions, LayoutQuery, TreeEdits } from './types';
import {
	defineLayout,
	useApi,
	useCollection,
	useExtensions,
	useItems,
	useStores,
	useSync,
} from '@directus/extensions-sdk';
import { getEndpoint } from '@directus/utils';
import { debounce, flatten } from 'lodash';
import {
	computed,

	provide,
	ref,

	toRefs,
	unref,
	watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import Actions from './actions.vue';
// CORE IMPORTS
import { useAliasFields } from './core-clones/composables/use-alias-fields';
import { useLayoutClickHandler } from './core-clones/composables/use-layout-click-handler';
import { adjustFieldsForDisplays } from './core-clones/utils/adjust-fields-for-displays';
import { formatItemsCountPaginated } from './core-clones/utils/format-items-count';
import { getDefaultDisplayForType } from './core-clones/utils/get-default-display-for-type';
import { hideDragImage } from './core-clones/utils/hide-drag-image';
import { saveAsCSV } from './core-clones/utils/save-as-csv';
import { syncRefProperty } from './core-clones/utils/sync-ref-property';
import Layout from './layout.vue';
import Options from './options.vue';
import { planSortMoves } from './sort-plan';

export default defineLayout<LayoutOptions, LayoutQuery>({
	id: 'directus-labs-tree-view-table-layout',
	name: 'Tree View Table Fixed',
	icon: 'format_indent_increase',
	component: Layout,
	slots: {
		options: Options,
		sidebar: () => {},
		actions: Actions,
	},
	headerShadow: false,
	setup(props, { emit }) {
		const system = { stores: useStores(), extensions: useExtensions() };
		provide('system', system);

		const { useFieldsStore } = system.stores;
		const fieldsStore = useFieldsStore();

		const selection = useSync(props, 'selection', emit);
		const layoutOptions = useSync(props, 'layoutOptions', emit);
		const layoutQuery = useSync(props, 'layoutQuery', emit);

		const { collection, filter, filterSystem, filterUser, search } =
            toRefs(props);

		const {
			info,
			primaryKeyField,
			fields: fieldsInCollection,
			sortField,
		} = useCollection(collection);

		const { sort, limit, page, fields } = useItemOptions();

		const { aliasedFields, aliasQuery, aliasedKeys } = useAliasFields(
			fields,
			collection,
			system,
		);

		const fieldsWithRelationalAliased = computed(() =>
			flatten(
				Object.values(aliasedFields.value).map(({ fields }) => fields),
			),
		);

		const { parentField, fieldsToQuery } = useTreeViewFieldsToQuery({
			fieldsWithRelationalAliased,
			primaryKeyField,
			sortField,
		});

		const shiftedColumns = syncRefProperty(layoutOptions, 'shiftedColumns', 1);
		const showGuides = syncRefProperty(layoutOptions, 'showGuides', true);
		const openDepth = syncRefProperty(layoutOptions, 'openDepth', null);

		const { onClick } = useLayoutClickHandler({
			props,
			selection,
			primaryKeyField,
		});

		const {
			items,
			loading,
			error,
			totalPages,
			itemCount,
			totalCount,
			getItems,
			getItemCount,
			getTotalCount,
		} = useItems(collection, {
			sort,
			limit,
			page,
			fields: fieldsToQuery,
			alias: aliasQuery,
			filter,
			search,
			filterSystem,
		});

		const {
			tableSort,
			tableHeaders,
			tableRowHeight,
			onSortChange,
			onAlignChange,
			activeFields,
			tableSpacing,
		} = useTable();

		const showingCount = computed(() => {
			// Don't show count if there are no items
			if (!totalCount.value || !itemCount.value)
				return;

			return formatItemsCountPaginated({
				currentItems: itemCount.value,
				currentPage: page.value,
				// -1 is Directus's "no limit": everything is on one page
				perPage: limit.value > 0 ? limit.value : itemCount.value,
				isFiltered: !!filterUser.value,
				totalItems: totalCount.value,
			});
		});

		const { isFiltered } = useFilteringTreeView({ filterUser, search });

		const { saveEdits, shownItems } = useSaveEdits();

		return {
			tableHeaders,
			items: shownItems,
			loading,
			error,
			totalPages,
			tableSort,
			onRowClick: onClick,
			onSortChange,
			onAlignChange,
			tableRowHeight,
			page,
			toPage,
			itemCount,
			totalCount,
			fieldsInCollection,
			fields,
			limit,
			activeFields,
			tableSpacing,
			parentField,
			shiftedColumns,
			showGuides,
			openDepth,
			primaryKeyField,
			info,
			showingCount,
			sortField,
			hideDragImage,
			refresh,
			resetPresetAndRefresh,
			clearFilters: props.clearFilters,
			selectAll,
			filter,
			search,
			download,
			fieldsWithRelationalAliased,
			aliasedFields,
			aliasedKeys,
			saveEdits,
			isFiltered,
		};

		async function resetPresetAndRefresh() {
			await props?.resetPreset?.();
			refresh();
		}

		function refresh() {
			getItems();
			getTotalCount();
			getItemCount();
		}

		function download() {
			if (!collection.value)
				return;
			saveAsCSV(collection.value, fields.value, items.value, system);
		}

		function toPage(newPage: number) {
			page.value = newPage;
		}

		function selectAll() {
			if (!primaryKeyField.value)
				return;
			const pk = primaryKeyField.value;
			selection.value = items.value.map((item) => item[pk.field]);
		}

		function useItemOptions() {
			const page = syncRefProperty(layoutQuery, 'page', 1);
			const limit = syncRefProperty(layoutQuery, 'limit', -1);

			const defaultSort = computed(() => {
				const field = sortField.value ?? primaryKeyField.value?.field;
				return field ? [field] : [];
			});

			const sort = syncRefProperty(layoutQuery, 'sort', defaultSort);

			const fieldsDefaultValue = computed(() => {
				return fieldsInCollection.value
					.filter(
						(field) =>
							!field.meta?.hidden
							&& !field.meta?.special?.includes('no-data'),
					)
					.slice(0, 4)
					.map(({ field }) => field)
					.sort();
			});

			const fields = computed({
				get() {
					return layoutQuery.value?.fields
						? layoutQuery.value.fields.filter((field) =>
								fieldsStore.getField(collection.value!, field),
							)
						: unref(fieldsDefaultValue);
				},
				set(value) {
					layoutQuery.value = Object.assign({}, layoutQuery.value, {
						fields: value,
					});
				},
			});

			const fieldsWithRelational = computed(() => {
				if (!props.collection)
					return [];
				return adjustFieldsForDisplays(
					fields.value,
					props.collection,
					system,
				);
			});

			return { sort, limit, page, fields, fieldsWithRelational };
		}

		function useTable() {
			const tableSort = computed(() => {
				if (!sort.value?.[0]) {
					return null;
				}
				else if (sort.value?.[0].startsWith('-')) {
					return { by: sort.value[0].slice(1), desc: true };
				}
				else {
					return { by: sort.value[0], desc: false };
				}
			});

			const localWidths = ref<{ [field: string]: number }>({});

			watch(
				() => layoutOptions.value,
				() => {
					localWidths.value = {};
				},
			);

			const saveWidthsToLayoutOptions = debounce(() => {
				layoutOptions.value = Object.assign({}, layoutOptions.value, {
					widths: localWidths.value,
				});
			}, 350);

			const activeFields = computed<(Field & { key: string })[]>({
				get() {
					if (!collection.value)
						return [];

					return fields.value
						.map((key) => ({
							...fieldsStore.getField(collection.value!, key),
							key,
						}))
						.filter(
							(f) =>
								f
								&& f.meta?.special?.includes('no-data') !== true,
						) as (Field & { key: string })[];
				},
				set(val) {
					fields.value = val.map((field) => field.field);
				},
			});

			const tableHeaders = computed<HeaderRaw[]>({
				get() {
					return activeFields.value.map((field) => {
						let description: string | null = null;

						const fieldParts = field.key.split('.');

						if (fieldParts.length > 1) {
							const fieldNames = fieldParts.map(
								(fieldKey, index) => {
									const pathPrefix = fieldParts.slice(
										0,
										index,
									);

									const field = fieldsStore.getField(
										collection.value!,
										[...pathPrefix, fieldKey].join('.'),
									);

									return field?.name ?? fieldKey;
								},
							);

							description = fieldNames.join(' -> ');
						}

						return {
							text: field.name,
							value: field.key,
							description,
							width:
                                localWidths.value[field.key]
                                || layoutOptions.value?.widths?.[field.key]
                                || null,
							align:
                                layoutOptions.value?.align?.[field.key]
                                || 'left',
							field: {
								display:
                                    field.meta?.display
                                    || getDefaultDisplayForType(field.type),
								displayOptions: field.meta?.display_options,
								interface: field.meta?.interface,
								interfaceOptions: field.meta?.options,
								type: field.type,
								field: field.field,
								collection: field.collection,
							},
							sortable:
                                ['json', 'alias', 'presentation', 'translations'].includes(field.type) === false,
						} as HeaderRaw;
					});
				},
				set(val) {
					const widths = {} as { [field: string]: number };

					for (const header of val) {
						if (header.width) {
							widths[header.value] = header.width;
						}
					}

					localWidths.value = widths;

					saveWidthsToLayoutOptions();

					fields.value = val.map((header) => header.value);
				},
			});

			const tableSpacing = syncRefProperty(
				layoutOptions,
				'spacing',
				'cozy',
			);

			const tableRowHeight = computed<number>(() => {
				switch (tableSpacing.value) {
					case 'compact':
						return 32;
					case 'comfortable':
						return 64;
					default:
						return 48;
				}
			});

			return {
				tableSort,
				tableHeaders,
				tableSpacing,
				tableRowHeight,
				onSortChange,
				onAlignChange,
				activeFields,
				getFieldDisplay,
			};

			function onSortChange(newSort: Sort | null) {
				if (!newSort?.by) {
					sort.value = [];
					return;
				}

				let sortString = newSort.by;

				if (newSort.desc === true) {
					sortString = `-${sortString}`;
				}

				sort.value = [sortString];
			}

			function onAlignChange(
				field: string,
				align: 'left' | 'center' | 'right',
			) {
				layoutOptions.value = Object.assign({}, layoutOptions.value, {
					align: {
						...layoutOptions.value?.align,
						[field]: align,
					},
				});
			}

			function getFieldDisplay(fieldKey: string) {
				const field = fieldsInCollection.value.find(
					(field: Field) => field.field === fieldKey,
				);

				if (!field?.meta?.display)
					return null;

				return {
					display: field.meta.display,
					options: field.meta.display_options,
				};
			}
		}

		function useTreeViewFieldsToQuery({
			fieldsWithRelationalAliased,
			primaryKeyField,
			sortField,
		}: {
			fieldsWithRelationalAliased: ComputedRef<string[]>;
			primaryKeyField: ComputedRef<Field | null>;
			sortField: ComputedRef<string | null>;
		}) {
			const parentField = syncRefProperty(layoutOptions, 'parent', null);

			const fieldsToQuery = computed(() => {
				// A copy, or the pushes below would grow the relational fields list itself
				const fieldsToQuery = [...fieldsWithRelationalAliased.value];
				addSortField();
				addParentField();

				return fieldsToQuery;

				function addSortField() {
					if (
						sortField.value
						&& !fieldsToQuery.includes(
							sortField.value,
						)
					) {
						fieldsToQuery.push(sortField.value);
					}
				}

				function addParentField() {
					if (
						parentField.value
						&& primaryKeyField.value
						&& !fieldsToQuery.some(
							(field) =>
								field === parentField.value
								|| field
								=== `${parentField.value}.${primaryKeyField.value?.field}`,
						)
					) {
						fieldsToQuery.push(
							`${parentField.value}.${primaryKeyField.value.field}`,
						);
					}
				}
			});

			watch(() => parentField.value, updateItemsOnNewParentQuery);

			return {
				parentField,
				fieldsToQuery,
			};

			function updateItemsOnNewParentQuery(
				newParentField: string | null | undefined,
			) {
				if (newParentField)
					refresh();
			}
		}

		function useFilteringTreeView({
			filterUser,
			search,
		}: {
			filterUser: Ref<Filter | null>;
			search: Ref<string | null | undefined>;
		}) {
			const isFiltered = computed(
				() => !!filterUser.value || !!search.value,
			);

			watch(() => isFiltered.value, turnOffManualSortOnFilter);

			return {
				isFiltered,
			};

			function turnOffManualSortOnFilter(filterIsActive: boolean) {
				if (filterIsActive)
					onSortChange(null);
			}
		}

		function useSaveEdits() {
			const api = useApi();
			const { unexpectedError } = useUnexpectedError();

			// Saves queue behind one another, as each plans its moves from the sort values the last left
			let queue = Promise.resolve();
			let pending = 0;
			let changed = false;
			// The table keeps its own order while any are pending: a reload landing between two drags
			// would put the second back where it was, until its own save reloaded it a moment later
			const shownItems = ref(items.value);
			watch(items, (loaded) => {
				if (!pending)
					shownItems.value = loaded;
			});

			return { saveEdits, shownItems };

			function saveEdits(edits: TreeEdits) {
				pending++;
				queue = queue.then(() => save(edits)).finally(() => {
					// Only when something changed, or a load that finds the order out of step and can't fix
					// it would load again and again
					if (--pending)
						return;
					if (changed)
						refresh();
					else shownItems.value = items.value;
					changed = false;
				});
			}

			/**
			 * Saves as little as possible. A new parent is a real edit, so a PATCH, but a new order goes
			 * through `/utils/sort`, as Directus's own table does: it only shifts the sort values between
			 * where an item was and where it went, and leaves `date_updated`, revisions and flows alone.
			 */
			async function save({ order, parent }: TreeEdits) {
				try {
					if (parent && parentField.value) {
						await api.patch(`${getEndpoint(collection.value!)}/${parent.id}`, {
							[parentField.value]: parent.parent,
						});
						changed = true;
					}
					if (order && await saveOrder(order))
						changed = true;
				}
				catch (error: any) {
					unexpectedError(error);
					changed = true;
				}
			}

			async function saveOrder(order: PrimaryKey[]) {
				const pk = primaryKeyField.value?.field;
				const sort = sortField.value;
				if (!pk || !sort)
					return false;

				let rows = await getSortValues(pk, sort);
				const values = rows.map((row) => row[sort]);
				// `/utils/sort` numbers any items without a value and renumbers the lot if two share one
				// before it moves anything, so a move of an item to its own place does just that, and the
				// plan below can then trust the values
				if (values.includes(null) || new Set(values).size !== values.length) {
					await api.post(`/utils/sort/${collection.value}`, { item: rows[0]![pk], to: rows[0]![pk] });
					rows = await getSortValues(pk, sort);
				}

				const moves = planSortMoves(rows.map((row) => row[pk]), order);
				for (const move of moves)
					await api.post(`/utils/sort/${collection.value}`, move);
				return moves.length > 0;
			}

			/** Fresh from the server rather than the loaded items, which the table has already reordered */
			async function getSortValues(pk: string, sort: string): Promise<Item[]> {
				const response = await api.get(getEndpoint(collection.value!), {
					params: { fields: [pk, sort], sort: [sort, pk], limit: -1 },
				});
				return response.data.data;
			}

			// Based from the core: /app/src/utils/unexpected-error.ts
			function useUnexpectedError() {
				const { useNotificationsStore } = system.stores;
				const notificationStore = useNotificationsStore();
				const { t } = useI18n();

				return {
					unexpectedError(error: any) {
						const code =
                            error.response?.data?.errors?.[0]?.extensions?.code || error?.extensions?.code || 'UNKNOWN';

						notificationStore.add({
							title: t(`errors.${code}`),
							type: 'error',
							code,
							dialog: true,
							error,
						});
					},
				};
			}
		}
	},
});
