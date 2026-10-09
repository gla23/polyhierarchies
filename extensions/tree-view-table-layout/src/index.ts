import type { Field, Filter, Item, PrimaryKey, Relation } from '@directus/types';
import type { ComputedRef, Ref, WritableComputedRef } from 'vue';
import type { HeaderRaw, Sort } from '@polyhierarchies/ui/table';
import type { LayerMode, LayoutOptions, LayoutQuery, TreeEdits } from './types';
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
import { createGraph, fromJunction, fromParentField } from '@polyhierarchies/core';
import { debounce, flatten } from 'lodash';
import { computed, provide, ref, toRefs, unref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Actions from './actions.vue';
// CORE IMPORTS
import { useAliasFields } from './core-clones/composables/use-alias-fields';
import { useLayoutClickHandler } from './core-clones/composables/use-layout-click-handler';
import { formatItemsCountPaginated, formatItemsCountRelative } from './core-clones/utils/format-items-count';
import { getDefaultDisplayForType } from './core-clones/utils/get-default-display-for-type';
import { hideDragImage } from './core-clones/utils/hide-drag-image';
import { saveAsCSV } from './core-clones/utils/save-as-csv';
import { getItemRoute } from './core-clones/utils/get-route';
import { syncRefProperty } from './core-clones/utils/sync-ref-property';
import Layout from './layout.vue';
import Options from './options.vue';
import { planSortMoves } from './sort-plan';

export default defineLayout<LayoutOptions, LayoutQuery>({
	id: 'directus-labs-tree-view-table-layout',
	name: 'Polyhierarchies',
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
		// Before anything reads the options it fills in
		const defaults = useSchemaDefaults();

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

		const hierarchy = withDefault(syncRefProperty(layoutOptions, 'hierarchy', undefined), defaults.hierarchy);
		const junction = withDefault(syncRefProperty(layoutOptions, 'junction', undefined), defaults.junction);
		const junctionParent = withDefault(syncRefProperty(layoutOptions, 'junctionParent', undefined), computed(() => defaults.ends(junction.value).parent));
		const junctionChild = withDefault(syncRefProperty(layoutOptions, 'junctionChild', undefined), computed(() => defaults.ends(junction.value).child));
		const junctionSortChoice = withDefault(syncRefProperty(layoutOptions, 'junctionSort', undefined), computed(() => defaults.sortOf(junction.value)));
		// Stored as `$none` when chosen, as null means unset, which would bring the schema's guess back
		const junctionSort = computed(() => (junctionSortChoice.value === '$none' ? null : junctionSortChoice.value));
		const treeColumn = withDefault(syncRefProperty(layoutOptions, 'treeColumn', undefined), defaults.treeColumn);
		const showGuides = syncRefProperty(layoutOptions, 'showGuides', true);
		// Filters usually exclude (archived, say); searches usually look for something
		const filterMode = syncRefProperty(layoutOptions, 'filterMode', 'hide');
		const searchModeStored = syncRefProperty(layoutOptions, 'searchMode', 'routes');
		// A search shows its routes or keeps the folds. Hiding is what a filter does, and turning a search
		// off is just clearing it, so a view that stored either (they were offered once) shows routes
		const searchMode = computed<'routes' | 'inplace'>({
			get: () => (searchModeStored.value === 'inplace' ? 'inplace' : 'routes'),
			set: (value) => (searchModeStored.value = value),
		});
		const modeMenus = syncRefProperty(layoutOptions, 'modeMenus', true);
		// Two levels unless a view says otherwise: the shape, without hundreds of rows. -1 is all.
		const openDepth = syncRefProperty(layoutOptions, 'openDepth', 2);
		// Deeper, the indent pushes every column after the tree column off screen
		const maxOpenDepth = syncRefProperty(layoutOptions, 'maxOpenDepth', 5);
		const rowClick = syncRefProperty(layoutOptions, 'rowClick', 'opens');

		const { onClick } = useLayoutClickHandler({
			props,
			selection,
			primaryKeyField,
		});

		/**
		 * Whether the items are drawn as a tree. A tree loads whole, with no page and no search or
		 * filter: those find matches within it instead (`useSearchMatches`), so a match keeps its place.
		 */
		const treeActive = computed(() =>
			hierarchy.value === 'polyhierarchy'
				? !!(junction.value && junctionParent.value && junctionChild.value)
				: !!parentField.value,
		);

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
			limit: computed(() => (treeActive.value ? -1 : limit.value)),
			// Writable, as useItems puts the page back to 1 when the query changes
			page: computed({ get: () => (treeActive.value ? 1 : page.value), set: (value) => (page.value = value) }),
			fields: fieldsToQuery,
			alias: aliasQuery,
			filter: computed(() => (treeActive.value ? null : filter.value)),
			search: computed(() => (treeActive.value ? null : search.value)),
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

		// Here in setup, as Directus does: Vue works the count out again outside any component to see if
		// it changed, and useI18n() throws there, so a change to the count alone never showed
		const { t: translate, n: formatNumber } = useI18n();
		const i18n = { t: translate, n: formatNumber };
		const showingCount = computed(() => {
			// Don't show count if there are no items
			if (!totalCount.value || !itemCount.value)
				return;
			// A tree also says how many items it starts from
			const roots = graph.value?.roots.length ?? 0;
			const tops = graph.value ? `, ${roots} ${roots === 1 ? 'root' : 'roots'}` : '';
			// Searching or filtering a tree: the items it shows, which the table counts, and how many match
			// when that's some but not all of them
			if (showing.value) {
				const { items: shown, matching } = showing.value;
				const counted = formatItemsCountPaginated({
					currentItems: shown,
					currentPage: 1,
					perPage: shown,
					isFiltered: true,
					totalItems: totalCount.value,
					i18n,
				});
				return offerNext.value ? `${counted}, ${matching} ${searching.value ? 'matching' : 'pass the filter'}` : counted;
			}
			return formatItemsCountPaginated({
				currentItems: itemCount.value,
				currentPage: page.value,
				// -1 is Directus's "no limit": everything is on one page
				perPage: limit.value > 0 ? limit.value : itemCount.value,
				isFiltered: !!filterUser.value,
				totalItems: totalCount.value,
				i18n,
			}) + tops;
		});

		const { isFiltered } = useFilteringTreeView({ filterUser, search });
		/**
		 * Sorted by a column rather than the hierarchy's own order: the tree stays, its siblings in the
		 * column's order (the items arrive sorted, and the graph follows their order), and nothing can
		 * be dragged into place until it's sorted by the hierarchy again.
		 */
		const columnSorted = computed(() => {
			const by = tableSort.value?.by;
			return !!by && by !== sortField.value && by !== primaryKeyField.value?.field;
		});
		const { matches, keep, highlightMode, searching } = useSearchMatches();
		const showing = ref<{ items: number; matching: number } | null>(null);
		/**
		 * Highlights that stand out, some of what's shown but not all of it: only then is there a next
		 * one to go to, or a count of them worth giving. A filter that hides leaves only what passes.
		 */
		const offerNext = computed(() =>
			!!matches.value && !!showing.value && showing.value.matching > 0 && showing.value.matching < showing.value.items,
		);
		/**
		 * Going to the next match: the table knows the matches' order and opens the way, so the top
		 * bar's button asks it through the layout, and hears back which one it's at
		 */
		const matchPosition = ref<{ at: number | null; of: number } | null>(null);
		const matchJump = ref<{ step: 1 | -1; n: number } | null>(null);
		const goToMatch = (step: 1 | -1 = 1) => (matchJump.value = { step, n: (matchJump.value?.n ?? 0) + 1 });

		const { links, linksActive, linkKey, loadLinks, linksError } = useJunction();
		const { saveEdits, shownItems } = useSaveEdits();
		const { graph, nodeLabel, itemsById } = useHierarchyGraph();
		const rowActions = useRowActions();

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
			hierarchy,
			junction,
			junctionParent,
			junctionChild,
			junctionSort: junctionSortChoice,
			graph,
			manualOrder: computed(() => linksActive.value && !columnSorted.value),
			matches,
			treeActive,
			columnSorted,
			// Searching, the tree can still be edited: a drop lands after the row it's dropped on. A taxonomy
			// with no sort field has nowhere to keep an order, so it nests without dragging
			treeReadonly: computed(() => treeActive.value && (columnSorted.value || (!linksActive.value && !sortField.value))),
			searchMode,
			filterMode,
			modeMenus,
			highlightMode,
			searching,
			offerNext,
			setShowing: (counts: { items: number; matching: number } | null) => (showing.value = counts),
			keep,
			matchPosition,
			setMatchPosition: (position: { at: number | null; of: number }) => (matchPosition.value = position),
			matchJump,
			goToMatch,
			setLayoutOptions,
			nodeLabel,
			treeColumn,
			showGuides,
			openDepth,
			maxOpenDepth,
			rowClick,
			linksError,
			...rowActions,
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

		/** An option as stored, or while it's unset, a default worked out from the schema; set, it's stored */
		function withDefault<T>(stored: WritableComputedRef<T | null | undefined>, fallback: Ref<T>) {
			return computed<T>({
				get: () => stored.value ?? fallback.value,
				set: (value) => (stored.value = value),
			});
		}

		/**
		 * Sensible defaults, so a collection shows as a tree without being set up. A parent field: the
		 * collection's one self-referencing many-to-one, if it has just one. Failing that, a
		 * polyhierarchy over a junction: a collection with two many-to-ones to this one, the parent
		 * guessed by name and the sort from the relation (or a field called sort). The tree column: the
		 * field the display template starts with, or the first plain text field shown, never a colour
		 * or an icon, which are too narrow to indent.
		 */
		function useSchemaDefaults() {
			const relationsStore = system.stores.useRelationsStore?.();
			const relations = computed<Relation[]>(() => relationsStore?.relations ?? []);
			const fieldsOf = (name: string | null | undefined): Field[] =>
				name ? (fieldsStore.getFieldsForCollection?.(name) ?? []) : [];

			const selfReferencing = computed(() =>
				fieldsInCollection.value.filter(
					(field) => ['string', 'uuid', 'integer', 'bigInteger'].includes(field.type) && field.schema?.foreign_key_table === collection.value,
				),
			);
			const junctions = computed(() => {
				const fieldsByJunction = new Map<string, string[]>();
				for (const relation of relations.value) {
					if (relation.related_collection !== collection.value || relation.collection === collection.value)
						continue;
					fieldsByJunction.set(relation.collection, [...(fieldsByJunction.get(relation.collection) ?? []), relation.field]);
				}
				return [...fieldsByJunction].filter(([, fields]) => fields.length >= 2);
			});

			const parent = computed(() => (selfReferencing.value.length === 1 ? selfReferencing.value[0]!.field : null));
			const hierarchy = computed<'taxonomy' | 'polyhierarchy'>(() =>
				layoutOptions.value?.parent || parent.value || !junctions.value.length ? 'taxonomy' : 'polyhierarchy',
			);
			const junction = computed(() => junctions.value[0]?.[0] ?? null);

			function ends(name: string | null) {
				const fields = junctions.value.find(([candidate]) => candidate === name)?.[1] ?? [];
				const parentEnd = fields.find((field) => /parent|broader|source|from/i.test(field)) ?? fields[0] ?? null;
				return { parent: parentEnd, child: fields.find((field) => field !== parentEnd) ?? null };
			}

			function sortOf(name: string | null) {
				if (!name)
					return null;
				const fromRelation = relations.value.find((relation) => relation.collection === name && relation.meta?.sort_field)?.meta?.sort_field;
				return fromRelation
					?? fieldsOf(name).find((field) => ['integer', 'bigInteger'].includes(field.type) && /^(sort|order|position)$/i.test(field.field))?.field
					?? null;
			}

			const treeColumn = computed(() => {
				const shown = fields.value;
				const interfaceOf = (key: string) => (fieldsStore.getField(collection.value!, key) as Field | null)?.meta?.interface ?? '';
				const textual = (key: string) => {
					const field: Field | null = fieldsStore.getField(collection.value!, key);
					return !!field
						&& ['string', 'text'].includes(field.type)
						&& !['select-color', 'select-icon', 'tab-icon-picker'].includes(field.meta?.interface ?? '')
						&& !field.meta?.special?.includes('uuid');
				};
				// The template's text fields first: `{{icon}} {{colour}} {{name}}` means name
				const templated = [...(info.value?.meta?.display_template ?? '').matchAll(/\{\{\s*(\w+)/g)].map((match) => match[1]!);
				const texts = [...new Set([...templated, ...shown])].filter((key) => shown.includes(key) && textual(key));
				// A field called name or title wins; then text typed in, before text picked from a short
				// list of choices (a dropdown's values are categories, rarely what an item is called)
				return texts.find((key) => /^(name|title)$/i.test(key))
					?? texts.find((key) => !interfaceOf(key).startsWith('select-'))
					?? texts[0]
					?? shown[0]
					?? '$controls';
			});

			return { parent, hierarchy, junction, ends, sortOf, treeColumn };
		}

		/**
		 * Several options in one write. Set one at a time, each starts from the options as they were
		 * before the last landed, so only the last survives: a swap would leave both ends the same.
		 */
		function setLayoutOptions(changes: Partial<LayoutOptions>) {
			layoutOptions.value = { ...layoutOptions.value, ...changes };
		}

		async function resetPresetAndRefresh() {
			await props?.resetPreset?.();
			refresh();
		}

		function refresh() {
			// The links come with the items, so a reload of one is a reload of both
			loadLinks();
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

			return { sort, limit, page, fields };
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

			// Compact unless a view says otherwise: a tree is read by its shape, and more of it fits
			const tableSpacing = syncRefProperty(
				layoutOptions,
				'spacing',
				'compact',
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
			const parentField = withDefault(syncRefProperty(layoutOptions, 'parent', null), defaults.parent);

			const fieldsToQuery = computed(() => {
				// A copy, or the pushes below would grow the relational fields list itself
				const fieldsToQuery = [...fieldsWithRelationalAliased.value];
				addSortField();
				addParentField();

				addTemplateFields();

				return fieldsToQuery;

				/** What the display template needs, so hints can name a node ("in Fruit") */
				function addTemplateFields() {
					const template = info.value?.meta?.display_template;
					for (const [, field] of template?.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g) ?? []) {
						if (field && !fieldsToQuery.includes(field))
							fieldsToQuery.push(field);
					}
				}

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
						hierarchy.value !== 'polyhierarchy'
						&& parentField.value
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

		/**
		 * A polyhierarchy's links: every row of the junction, with only the fields the graph needs,
		 * loaded with the items and again after each save. Without read access to the junction there
		 * are no links, so the items show flat rather than wrongly nested.
		 */
		function useJunction() {
			const api = useApi();
			const links = ref<Item[]>([]);
			const linkKey = computed<string>(
				() => fieldsStore.getPrimaryKeyFieldForCollection?.(junction.value)?.field ?? 'id',
			);
			const linksActive = computed(
				() => hierarchy.value === 'polyhierarchy' && !!junction.value && !!junctionParent.value && !!junctionChild.value,
			);

			/** Why the links couldn't be had, so the layout can say so rather than draw every item at the top */
			const linksError = ref<'forbidden' | 'failed' | null>(null);

			async function loadLinks() {
				if (!linksActive.value) {
					links.value = [];
					linksError.value = null;
					return;
				}
				try {
					const fields = [linkKey.value, junctionParent.value, junctionChild.value, junctionSort.value].filter(Boolean);
					const response = await api.get(getEndpoint(junction.value!), { params: { fields, limit: -1 } });
					links.value = response.data.data ?? [];
					linksError.value = null;
				}
				catch (error: any) {
					links.value = [];
					linksError.value = error?.response?.status === 403 ? 'forbidden' : 'failed';
				}
			}

			watch([linksActive, junction, junctionParent, junctionChild, junctionSort], loadLinks, { immediate: true });

			return { links, linksActive, linkKey, loadLinks, linksError };
		}

		/**
		 * The hierarchy as a graph for the table to draw by placement: each item naming its one parent
		 * (a taxonomy), or the junction's links giving it any number (a polyhierarchy).
		 */
		function useHierarchyGraph() {
			const graph = computed(() => {
				const key = primaryKeyField.value?.field;
				if (!key)
					return null;
				const id = `directus:${collection.value}`;
				if (linksActive.value) {
					// Sorted by a column, a parent's children come in the items' order, not the links'
					const position = new Map(shownItems.value.map((item, index) => [String(item[key]), index]));
					const ordered = columnSorted.value
						? [...links.value].sort((a, b) => (position.get(String(a[junctionChild.value!])) ?? 0) - (position.get(String(b[junctionChild.value!])) ?? 0))
						: links.value;
					return createGraph(fromJunction(shownItems.value, ordered, {
						id,
						key,
						parent: junctionParent.value!,
						child: junctionChild.value!,
						sort: columnSorted.value ? null : junctionSort.value,
					}));
				}
				if (hierarchy.value !== 'polyhierarchy' && parentField.value)
					return createGraph(fromParentField(shownItems.value, { id, key, parent: parentField.value }));
				return null;
			});

			/**
			 * An item's name, for hints like "in Fruit": its text in the tree column, as its own row shows
			 * it; else the collection's display template, if every field it names was loaded (only the
			 * shown columns are); else a name, title or label; else the id. The template comes second as
			 * it fills in an icon or colour as its raw value: `{{icon}} {{name}}` reads "folder Fruit".
			 */
			const itemsById = computed(() => new Map(shownItems.value.map((item) => [String(item[primaryKeyField.value?.field ?? 'id']), item])));
			const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
			function nodeLabel(id: string) {
				const item = itemsById.value.get(id);
				if (!item)
					return id;
				let loaded = true;
				const templated = (info.value?.meta?.display_template ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_: string, path: string) => {
					const value = path.split('.').reduce((at: any, part: string) => at?.[part], item);
					if (value === undefined)
						loaded = false;
					return String(value ?? '');
				});
				return text(item[treeColumn.value])
					?? (loaded ? text(templated) : null)
					?? text(item.name) ?? text(item.title) ?? text(item.label)
					?? id;
			}

			return { graph, nodeLabel, itemsById };
		}

		/**
		 * The table's selected row, and what's offered for it after its name: open it (when a click
		 * selects), and in a polyhierarchy give it more parents or children, picked in Directus's own
		 * drawer, or take it out of the parent it's shown under; in a taxonomy, give it a new parent.
		 */
		function useRowActions() {
			const api = useApi();
			const router = useRouter();
			const { usePermissionsStore, useUserStore, useNotificationsStore } = system.stores;
			const permissions = usePermissionsStore();
			const user = useUserStore();

			const cursor = ref<Item | null>(null);
			const setCursor = (row: Item | null) => (cursor.value = row);
			const cursorNode = computed(() => (cursor.value?.['--node'] as string | undefined) ?? null);
			/** The node it's shown under here: a placement's key is its route */
			const cursorParent = computed(() => String(cursor.value?.['--key'] ?? '').split('/').at(-2) ?? null);
			const allowed = (action: 'create' | 'delete') =>
				computed(() => linksActive.value && (user.isAdmin || !!permissions.getPermission(junction.value, action)));
			const canLink = allowed('create');
			const canUnlink = allowed('delete');
			const canReparent = computed(() => {
				if (linksActive.value || !parentField.value || !collection.value)
					return false;
				if (user.isAdmin)
					return true;
				const fields = permissions.getPermission(collection.value, 'update')?.fields;
				return !!fields && (fields.includes('*') || fields.includes(parentField.value));
			});

			/** The item's own primary key, as the graph's ids are strings */
			function keyOf(id: string) {
				const pk = primaryKeyField.value?.field;
				return (pk ? itemsById.value.get(id)?.[pk] : undefined) ?? id;
			}

			function openCursor() {
				if (cursorNode.value)
					router.push(getItemRoute(collection.value!, keyOf(cursorNode.value)));
			}

			/**
			 * For the picker: the item itself, and what it's already linked to that way. Reparenting a
			 * taxonomy, everything inside it too, as a branch can't go under itself.
			 */
			function pickerFilter(role: 'parent' | 'child' | 'reparent'): Filter | null {
				const pk = primaryKeyField.value?.field;
				const node = cursorNode.value;
				if (!pk || !node)
					return null;
				if (role === 'reparent') {
					const inside = graph.value?.descendants(node).flat() ?? [];
					return { [pk]: { _nin: [node, ...inside].map(keyOf) } } as Filter;
				}
				const [mine, theirs] = role === 'parent' ? [junctionChild.value!, junctionParent.value!] : [junctionParent.value!, junctionChild.value!];
				const linked = links.value.filter((link) => String(link[mine]) === node).map((link) => link[theirs]);
				return { [pk]: { _nin: [keyOf(node), ...linked] } } as Filter;
			}

			/** New links, each at the end of its parent's children */
			async function linkCursor(role: 'parent' | 'child', picked: PrimaryKey[]) {
				const node = cursorNode.value;
				if (!node || !picked.length)
					return;
				const [parentField, childField, sortField] = [junctionParent.value!, junctionChild.value!, junctionSort.value];
				const lastSort = new Map<string, number>();
				for (const link of links.value) {
					if (sortField && typeof link[sortField] === 'number')
						lastSort.set(String(link[parentField]), Math.max(lastSort.get(String(link[parentField])) ?? 0, link[sortField]));
				}
				const rows = picked.map((other) => {
					const [parent, child] = role === 'parent' ? [other, keyOf(node)] : [keyOf(node), other];
					const row: Item = { [parentField]: parent, [childField]: child };
					if (sortField) {
						const next = (lastSort.get(String(parent)) ?? 0) + 1;
						lastSort.set(String(parent), next);
						row[sortField] = next;
					}
					return row;
				});
				try {
					await api.post(getEndpoint(junction.value!), rows);
				}
				catch (error) {
					failed(error);
				}
				await loadLinks();
			}

			/** A taxonomy's one parent, set afresh; none picked, the top level */
			async function reparentCursor(parent: PrimaryKey | null) {
				const node = cursorNode.value;
				if (!node || !parentField.value)
					return;
				try {
					await api.patch(`${getEndpoint(collection.value!)}/${keyOf(node)}`, { [parentField.value]: parent });
				}
				catch (error) {
					failed(error);
				}
				refresh();
			}

			async function unlinkCursor() {
				const [node, parent] = [cursorNode.value, cursorParent.value];
				const link = links.value.find((row) => String(row[junctionParent.value!]) === parent && String(row[junctionChild.value!]) === node);
				if (!link)
					return;
				try {
					await api.delete(`${getEndpoint(junction.value!)}/${link[linkKey.value]}`);
				}
				catch (error) {
					failed(error);
				}
				await loadLinks();
			}

			function failed(error: any) {
				useNotificationsStore().add({
					title: error?.response?.data?.errors?.[0]?.message ?? 'The links couldn\'t be saved',
					type: 'error',
				});
			}

			return { cursor, setCursor, cursorNode, cursorParent, canLink, canUnlink, canReparent, openCursor, pickerFilter, linkCursor, unlinkCursor, reparentCursor };
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

			// Flat, a filtered list can't keep its manual order; a tree keeps its shape and shows the matches
			watch(() => isFiltered.value, turnOffManualSortOnFilter);

			return {
				isFiltered,
			};

			function turnOffManualSortOnFilter(filterIsActive: boolean) {
				if (filterIsActive && !treeActive.value)
					onSortChange(null);
			}
		}

		/**
		 * Searching or filtering a tree: Directus finds the matching items, with the same search and
		 * filter it would have applied to the list, asked separately so each can have its own mode.
		 * Hide layers keep only what matches (`keep`); highlight layers combine, as Directus's search
		 * and filter do, both must match (`matches`); the search's mode decides how highlights show.
		 */
		function useSearchMatches() {
			const api = useApi();
			const filterSet = ref<Set<string> | null>(null);
			const searchSet = ref<Set<string> | null>(null);
			let asked = 0;
			async function idsWith(params: Record<string, unknown>, pk: string) {
				const response = await api.get(getEndpoint(collection.value!), { params: { fields: [pk], limit: -1, ...params } });
				return new Set<string>(response.data.data.map((item: Item) => String(item[pk])));
			}
			async function find() {
				const pk = primaryKeyField.value?.field;
				const ask = ++asked;
				if (!treeActive.value || !pk) {
					filterSet.value = searchSet.value = null;
					return;
				}
				try {
					const [filtered, searched] = await Promise.all([
						filterUser.value && filterMode.value !== 'off' ? idsWith({ filter: filter.value }, pk) : null,
						search.value ? idsWith({ search: search.value }, pk) : null,
					]);
					// A newer search may have finished first
					if (ask === asked) {
						filterSet.value = filtered;
						searchSet.value = searched;
					}
				}
				catch {
					if (ask === asked)
						filterSet.value = searchSet.value = null;
				}
			}
			// A mode turned off and on again fetches afresh, as nothing was kept while it was off
			watch([treeActive, filter, filterUser, search, () => filterMode.value === 'off'], find, { immediate: true, deep: true });

			const both = (sets: (Set<string> | null)[]) => {
				const present = sets.filter((set): set is Set<string> => !!set);
				return present.length ? new Set([...present[0]!].filter((id) => present.every((set) => set.has(id)))) : null;
			};
			const keep = computed(() => (filterMode.value === 'hide' ? filterSet.value : null));
			const highlights = (mode: LayerMode) => mode === 'routes' || mode === 'inplace';
			const matches = computed(() => both([
				highlights(filterMode.value) ? filterSet.value : null,
				searchSet.value,
			]));
			// The search's way of highlighting when searching, else the filter's
			const highlightMode = computed<'routes' | 'inplace'>(() =>
				searchSet.value ? searchMode.value : filterMode.value === 'inplace' ? 'inplace' : 'routes',
			);
			// Searching rather than only filtering: what the hints and the count call the highlights
			const searching = computed(() => !!searchSet.value);
			return { matches, keep, highlightMode, searching };
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
			// Never undefined: Directus leaves its items so when a response comes back without data (seen in
			// Firefox), and everything built on them would throw
			const shownItems = ref<Item[]>(items.value ?? []);
			watch(items, (loaded) => {
				if (!pending)
					shownItems.value = loaded ?? [];
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
					else shownItems.value = items.value ?? [];
					changed = false;
				});
			}

			/**
			 * Saves as little as possible. A new parent is a real edit, so a PATCH, but a new order goes
			 * through `/utils/sort`, as Directus's own table does: it only shifts the sort values between
			 * where an item was and where it went, and leaves `date_updated`, revisions and flows alone.
			 */
			async function save({ order, parent, moved }: TreeEdits) {
				try {
					if (linksActive.value) {
						if (moved && await saveLinks(moved))
							changed = true;
						return;
					}
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

			/**
			 * A drop in a polyhierarchy, as changes to the junction's links: a move points the dragged
			 * placement's link at its new parent; Alt adds a link and keeps the old one; a drop at the
			 * top level removes the link, but only when it's the node's last parent, as otherwise it
			 * has a home already. Then the new parent's links are renumbered in the order shown.
			 */
			async function saveLinks(moved: NonNullable<TreeEdits['moved']>) {
				const endpoint = getEndpoint(junction.value!);
				const pk = primaryKeyField.value!.field;
				const parentKey = junctionParent.value!;
				const childKey = junctionChild.value!;
				const keyOf = (node: string) => shownItems.value.find((item) => String(item[pk]) === node)?.[pk] ?? node;
				const linkOf = (from: string, node: string) =>
					links.value.find((link) => String(link[parentKey]) === from && String(link[childKey]) === node);
				const old = moved.from ? linkOf(moved.from, moved.node) : undefined;

				// No sort field on the links: a drop that only reordered can't be kept, so say why
				if (!moved.link && moved.from === moved.to && !junctionSort.value) {
					const { useNotificationsStore } = system.stores;
					useNotificationsStore().add({
						title: `Not reordered: ${junction.value} has no sort field to keep an order in`,
						text: 'Rows can still be moved to another parent. Add an integer sort field to the links, then choose it under Order of children.',
						type: 'info',
					});
					return true;
				}
				if (moved.link) {
					if (!moved.to || linkOf(moved.to, moved.node))
						return false;
					await api.post(endpoint, { [parentKey]: keyOf(moved.to), [childKey]: keyOf(moved.node) });
				}
				else if (moved.from !== moved.to) {
					if (moved.to) {
						// Already a child there too: the move just drops the old link
						if (linkOf(moved.to, moved.node)) {
							if (old)
								await api.delete(`${endpoint}/${old[linkKey.value]}`);
						}
						else if (old) {
							await api.patch(`${endpoint}/${old[linkKey.value]}`, { [parentKey]: keyOf(moved.to) });
						}
						else {
							await api.post(endpoint, { [parentKey]: keyOf(moved.to), [childKey]: keyOf(moved.node) });
						}
					}
					else if (old) {
						const homes = links.value.filter((link) => String(link[childKey]) === moved.node).length;
						if (homes > 1)
							return true; // Put back by the reload: it has another parent already
						await api.delete(`${endpoint}/${old[linkKey.value]}`);
					}
				}

				if (moved.to && junctionSort.value)
					await renumber(endpoint, keyOf(moved.to), moved.node, moved.index);
				return true;
			}

			/** The parent's links in their order, with the moved one at its new place, numbered 1, 2, 3 */
			async function renumber(endpoint: string, parent: PrimaryKey, node: string, index: number) {
				const sort = junctionSort.value!;
				const response = await api.get(endpoint, {
					params: { fields: [linkKey.value, junctionChild.value, sort], filter: { [junctionParent.value!]: { _eq: parent } }, limit: -1 },
				});
				const siblings: Item[] = response.data.data;
				siblings.sort((a, b) => (a[sort] ?? Infinity) - (b[sort] ?? Infinity));
				const position = siblings.findIndex((link) => String(link[junctionChild.value!]) === node);
				if (position >= 0) {
					const [link] = siblings.splice(position, 1);
					siblings.splice(Math.min(index, siblings.length), 0, link!);
				}
				const changes = siblings
					.map((link, at) => ({ [linkKey.value]: link[linkKey.value], [sort]: at + 1, was: link[sort] }))
					.filter((change) => change.was !== change[sort])
					.map(({ was: _was, ...change }) => change);
				if (changes.length)
					await api.patch(endpoint, changes);
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
