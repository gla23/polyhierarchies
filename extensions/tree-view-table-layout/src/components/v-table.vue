<script setup lang="ts">
import type { ShowSelect } from '@directus/extensions';

import type { PrimaryKey } from '@directus/types';
import type { ComputedRef, Ref } from 'vue';
import type {
	Header,
	HeaderRaw,
	Item,
	ItemSelectEvent,
	Sort,
} from '../core-clones/components/v-table/types';
import { useEventListener, useLocalStorage } from '@vueuse/core';
import { clone, forEach, pick } from 'lodash';
import {
	computed,

	ref,

	toRef,
	useSlots,
	watch,
} from 'vue';
import Sortable from './sortable/sortable.vue';
import TableHeader from './table-header.vue';
import TableRow from './table-row.vue';

const props = withDefaults(
	defineProps<{
		headers: HeaderRaw[];
		items: Item[];
		itemKey?: string;
		sort?: Sort | null;
		mustSort?: boolean;
		showSelect?: ShowSelect;
		showResize?: boolean;
		showManualSort?: boolean;
		manualSortKey?: string;
		allowHeaderReorder?: boolean;
		modelValue?: any[];
		fixedHeader?: boolean;
		loading?: boolean;
		loadingText?: string;
		noItemsText?: string;
		rowHeight?: number;
		selectionUseKeys?: boolean;
		inline?: boolean;
		disabled?: boolean;
		clickable?: boolean;
		parentField: string | null;
		collection: string;
		/** How many columns, from the first, move with the hierarchy (see `rowGridColumns`) */
		shiftedColumns?: number;
		/** The faint lines from an open item's chevron down everything inside it */
		showGuides?: boolean;
	}>(),
	{
		itemKey: 'id',
		sort: undefined,
		mustSort: false,
		showSelect: 'none',
		showResize: false,
		showManualSort: false,
		manualSortKey: undefined,
		allowHeaderReorder: false,
		modelValue: () => [],
		fixedHeader: false,
		loading: false,
		// CORE CHANGE
		// loadingText: i18n.global.t("loading"),
		// noItemsText: i18n.global.t("no_items"),
		rowHeight: 48,
		selectionUseKeys: false,
		inline: false,
		disabled: false,
		clickable: true,
		shiftedColumns: 1,
		showGuides: true,
	},
);

const emit = defineEmits([
	'click:row',
	'update:sort',
	'item-selected',
	'update:modelValue',
	'update:headers',
	'update:items',
]);

// CORE CHANGES
// import { i18n } from "@/lang";
// import { hideDragImage } from '@/utils/hide-drag-image';
// import { Header, HeaderRaw, Item, ItemSelectEvent, Sort } from "./types";

const HeaderDefaults: Header = {
	text: '',
	value: '',
	align: 'left',
	sortable: true,
	width: null,
	description: null,
};

const slots = useSlots();

const internalHeaders = computed({
	get: () => {
		return props.headers
			.map((header: HeaderRaw) => ({
				...HeaderDefaults,
				...header,
			}))
			.map((header) => {
				if (header.width && header.width < 24) {
					header.width = 24;
				}

				return header;
			});
	},
	set: (newHeaders: Header[]) => {
		emit(
			'update:headers',
			// We'll return the original headers with the updated values, so we don't stage
			// all the default values
			newHeaders.map((header) => {
				const keysThatAreNotAtDefaultValue: string[] = [];

				forEach(header, (value, key: string) => {
					const objKey = key as keyof Header;

					if (value !== HeaderDefaults[objKey]) {
						keysThatAreNotAtDefaultValue.push(key);
					}
				});

				return pick(header, keysThatAreNotAtDefaultValue);
			}),
		);
	},
});

// In case the sort prop isn't used, we'll use this local sort state as a fallback.
// This allows the table to allow inline sorting on column out of the box without the need for
const internalSort = computed<Sort>(
	() =>
		props.sort ?? {
			by: null,
			desc: false,
		},
);

const reordering = ref<boolean>(false);

const hasHeaderAppendSlot = computed(
	() => slots['header-append'] !== undefined,
);

const hasHeaderContextMenuSlot = computed(
	() => slots['header-context-menu'] !== undefined,
);

const hasItemAppendSlot = computed(
	() => slots['item-append'] !== undefined,
);

const fullColSpan = computed<string>(() => {
	let length = internalHeaders.value.length + 1; // +1 account for spacer
	if (props.showSelect !== 'none')
		length++;
	if (props.showManualSort)
		length++;
	if (hasItemAppendSlot.value)
		length++;

	return `1 / span ${length}`;
});

const allItemsSelected = computed<boolean>(() => {
	return (
		props.loading === false
		&& props.items.length > 0
		&& props.modelValue.length === props.items.length
	);
});

const someItemsSelected = computed<boolean>(() => {
	return props.modelValue.length > 0 && allItemsSelected.value === false;
});

function onItemSelected(event: ItemSelectEvent) {
	if (props.disabled)
		return;

	emit('item-selected', event);

	let selection = clone(props.modelValue) as any[];

	if (event.value === true) {
		if (props.selectionUseKeys) {
			selection.push(event.item[props.itemKey]);
		}
		else {
			selection.push(event.item);
		}
	}
	else {
		selection = selection.filter((item) => {
			if (props.selectionUseKeys) {
				return item !== event.item[props.itemKey];
			}

			return item[props.itemKey] !== event.item[props.itemKey];
		});
	}

	if (props.showSelect === 'one') {
		selection = selection.slice(-1);
	}

	emit('update:modelValue', selection);
}

function getSelectedState(item: Item) {
	const selectedKeys = props.selectionUseKeys
		? props.modelValue
		: props.modelValue.map((item) => item[props.itemKey]);

	return selectedKeys.includes(item[props.itemKey]);
}

function onToggleSelectAll(value: boolean) {
	if (props.disabled)
		return;

	if (value === true) {
		if (props.selectionUseKeys) {
			emit(
				'update:modelValue',
				clone(props.items).map((item) => item[props.itemKey]),
			);
		}
		else {
			emit('update:modelValue', clone(props.items));
		}
	}
	else {
		emit('update:modelValue', []);
	}
}

function updateSort(newSort: Sort) {
	emit('update:sort', newSort?.by ? newSort : null);
}

const controlIconWidth = 28;
const controlIconWidthCSS = `${controlIconWidth}px`;

/** How many columns follow the hierarchy: none unless the table is actually nesting */
const shiftedCount = computed(() =>
	gridTemplateTreeColumnWidth.value
		? Math.min(Math.max(0, props.shiftedColumns), internalHeaders.value.length)
		: 0,
);

/**
 * Changing the shifted count slides the columns to their new widths. That lays out every row each
 * frame, so it's only for that moment (a resize drag stays instant) and only for a page of rows.
 */
const reshaping = ref(false);
let reshaped: ReturnType<typeof setTimeout> | undefined;
watch(
	() => props.shiftedColumns,
	() => {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		if (internalItems.value.length > 300)
			return;
		reshaping.value = true;
		clearTimeout(reshaped);
		reshaped = setTimeout(() => (reshaping.value = false), 200);
	},
);

/**
 * A shifted row's controls: the chevron slot (first, and kept on leaves, so siblings line up
 * whether or not they have children), handle, checkbox and the row's own indent. No padding after:
 * the first column's own padding shrinks to match (`.has-controls` below).
 */
function shiftedControlsWidth(depth: number) {
	let width = controlIconWidth + depth * controlIconWidth;
	if (props.showSelect !== 'none')
		width += controlIconWidth;
	if (props.showManualSort && !mergedHandle.value)
		width += controlIconWidth;
	return width;
}

/**
 * A nesting table's chevron is also its drag handle: a folder folds on a click and moves on a drag,
 * as in VS Code or Finder, and a leaf shows the handle in the chevron's place. One icon fewer on
 * every row, and each row's first mark sits at its own level. A flat table keeps its handle.
 */
// eslint-disable-next-line @typescript-eslint/no-use-before-define
const mergedHandle = computed(() => props.showManualSort && gridTemplateTreeColumnWidth.value > 0);

/**
 * Each column's width as drawn. A stored width is for the content alone; the last shifted column
 * gives up each row's indent, so it's drawn wider by the deepest one. Every row then keeps at least
 * its stored width, and even a column as narrow as a status dot keeps the ones after it in line.
 * Only the drawing grows, so changing the shifted count never rewrites a stored width.
 */
const drawnWidths = computed(() =>
	internalHeaders.value.map((header, index) =>
		(header.width || 160) + (index === shiftedCount.value - 1 ? gridTemplateTreeColumnWidth.value : 0),
	),
);
const drawnHeaderWidths = computed(() =>
	Object.fromEntries(internalHeaders.value.map((header, index) => [header.value, drawnWidths.value[index]!])),
);

/**
 * A row's own `--grid-columns`, or none to use the table's. Its controls grow by its indent and the
 * last shifted column shrinks by the same, so the columns after it stay in line. At the top level
 * every column is exactly its drawn width, so nothing jumps when manual sorting is toggled.
 */
function rowGridColumns(depth: number) {
	if (!shiftedCount.value)
		return undefined;
	const widths = drawnWidths.value.map((width, index) =>
		index === shiftedCount.value - 1 ? width - depth * controlIconWidth : width,
	);
	return { '--grid-columns': generate(widths, shiftedControlsWidth(depth)) };
}

const columnStyleControlWidth = computed(() => getControlColumnWidth());

function generate(widths: (number | 'auto')[], controlColumnWidth: number) {
	let gridTemplateColumns = widths
		.map((width) => (width === 'auto' ? 'auto' : `${width}px`))
		.join(' ');

	if (controlColumnWidth)
		gridTemplateColumns = `${controlColumnWidth}px ${gridTemplateColumns}`;

	gridTemplateColumns = `${gridTemplateColumns} 1fr`;

	if (hasItemAppendSlot.value || hasHeaderAppendSlot.value)
		gridTemplateColumns += ' min-content';

	return gridTemplateColumns;
}

function getControlColumnWidth() {
	let controlColumnWidth = 0;

	if (props.showSelect !== 'none')
		controlColumnWidth += controlIconWidth;

	if (props.showManualSort && !mergedHandle.value)
		controlColumnWidth += controlIconWidth;

	// The indent reserve, plus the chevron slot every row of a nesting table keeps
	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	if (gridTemplateTreeColumnWidth.value)
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		controlColumnWidth += gridTemplateTreeColumnWidth.value + controlIconWidth;

	// No padding after the controls, where Directus has 16px: the first column sits right by them
	// (`.has-controls` below) whether or not the table nests, so a width that just fits its content
	// with the hierarchy on still fits with it off
	return controlColumnWidth;
}

const columnStyle = computed<{ header: string; rows: string }>(() => {
	const controlColumnWidth = columnStyleControlWidth.value;
	return {
		// Sized columns follow their header cell ('auto'); unsized ones are a fixed track, so the
		// shifted column's reserve goes on the track when it has no width of its own
		header: generate(
			internalHeaders.value.map((header, index) => (header.width ? 'auto' : drawnWidths.value[index]!)),
			shiftedCount.value ? shiftedControlsWidth(0) : controlColumnWidth,
		),
		rows: generate(
			drawnWidths.value,
			controlColumnWidth,
		),
	};
});

const internalItems = ref(props.items);

watch(
	() => props.items,
	(newItems) => (internalItems.value = newItems),
);

const sortIsManual = computed(
	() => internalSort.value.by === props.manualSortKey,
);

const {
	gridTemplateTreeColumnWidth,
	depthChangeMax,
	itemDepth,
	itemParent,
	childrenKey,
	collapsedKey,
	collapsedParentsKey,
	onSortUpdate,
	onToggleChildren,
	setAllCollapsed,
	setCollapsed,
} = useTreeView({
	internalItems,
	parentField: toRef(props, 'parentField'),
	itemKey: toRef(props, 'itemKey'),
	sortKey: toRef(props, 'manualSortKey'),
	showManualSort: toRef(props, 'showManualSort'),
	collection: toRef(props, 'collection'),
	sortIsManual,
	controlIconWidth,
});

/**
 * Tree guides: a faint line from under an open item's chevron down everything inside it, curving
 * at the bottom of the last row so it wraps the whole of it; curving mid-row made the last item look
 * half outside. Each row draws its share, a line for every ancestor, so the lines fold with the rows.
 */
type Guide = { level: number; kind: 'through' | 'end' | 'stub' };
const guidesById = computed(() => {
	const guides = new Map<PrimaryKey, Guide[]>();
	if (!props.showGuides || !gridTemplateTreeColumnWidth.value)
		return guides;
	const byId = new Map(internalItems.value.map((item) => [item[props.itemKey], item]));
	const lastChild = new Map<PrimaryKey, PrimaryKey>();
	for (const item of internalItems.value) {
		if (byId.has(item[itemParent]))
			lastChild.set(item[itemParent], item[props.itemKey]);
	}
	for (const item of internalItems.value) {
		// Its ancestors on this page, top first; stopping at one seen already, should the data loop
		const path: PrimaryKey[] = [item[props.itemKey]];
		for (let parent = item[itemParent]; byId.has(parent) && !path.includes(parent); parent = byId.get(parent)![itemParent])
			path.unshift(parent);
		const depth = path.length - 1;
		const open = !!item[childrenKey]?.length && !item[collapsedKey];
		const own: Guide[] = [];
		// The row is the last of an ancestor's rows if it's closed and last child all the way down
		let lastBelow = !open;
		for (let level = depth - 1; level >= 0; level--) {
			lastBelow &&= lastChild.get(path[level]!) === path[level + 1];
			own.push({ level, kind: lastBelow ? 'end' : 'through' });
		}
		if (open)
			own.push({ level: depth, kind: 'stub' });
		guides.set(item[props.itemKey], own);
	}
	return guides;
});

/**
 * Where guides end, the curve is drawn by the next row shown, as its top border is the divider it
 * curves onto: drawn by the row above, the next row paints over it. So the ending row's lines stop
 * short (`continuing`), the next row draws the corners (`cornersBelow`), and its divider starts
 * where the outermost corner ends (`insets`). That row is always at the outermost corner's depth.
 */
const guideJoins = computed(() => {
	const continuing = new Set<PrimaryKey>();
	const cornersBelow = new Map<PrimaryKey, number[]>();
	const insets = new Set<PrimaryKey>();
	let ended: { id: PrimaryKey; levels: number[] } | null = null;
	for (const item of internalItems.value) {
		if (item[collapsedParentsKey]?.length)
			continue;
		if (ended) {
			continuing.add(ended.id);
			cornersBelow.set(item[props.itemKey], ended.levels);
			if (Math.min(...ended.levels) === (item[itemDepth] ?? 0))
				insets.add(item[props.itemKey]);
		}
		const levels = (guidesById.value.get(item[props.itemKey]) ?? [])
			.filter((guide) => guide.kind === 'end')
			.map((guide) => guide.level);
		ended = levels.length ? { id: item[props.itemKey], levels } : null;
	}
	return { continuing, cornersBelow, insets };
});

const foldableItems = computed(() => internalItems.value.filter((item) => item[childrenKey]?.length));
/** Every item with children on this page folded, so the header's chevron unfolds rather than folds */
const allFolded = computed(
	() => foldableItems.value.length > 0 && foldableItems.value.every((item) => item[collapsedKey]),
);

/**
 * ⌘/Ctrl-clicking a chevron folds or unfolds everything inside the item, leaving the item itself as
 * it is: folding it too would hide what the click did. Any of them open, they all fold; all folded,
 * they all unfold. ⌥/Alt-clicking folds or unfolds the item and its siblings, all the way the
 * clicked one goes. While the key is held over a chevron, the ones that will change are lit.
 */
type FoldReach = 'inside' | 'siblings';
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const reachKeys = isMac ? { inside: '⌘', siblings: '⌥' } : { inside: 'Ctrl', siblings: 'Alt' };
const reachHeld = ref<FoldReach | null>(null);
const hoveredChevron = ref<PrimaryKey | null>(null);

const reachOf = (event: KeyboardEvent | MouseEvent): FoldReach | null =>
	event.metaKey || event.ctrlKey ? 'inside' : event.altKey ? 'siblings' : null;
useEventListener(window, 'keydown', (event) => (reachHeld.value = reachOf(event)));
useEventListener(window, 'keyup', (event) => (reachHeld.value = reachOf(event)));
// Released while the window was in the background, the keyup never comes
useEventListener(window, 'blur', () => (reachHeld.value = null));

function onChevronHover(item: Item, event: PointerEvent | null) {
	hoveredChevron.value = event ? item[props.itemKey] : null;
	if (event)
		reachHeld.value = reachOf(event);
}

const hasChildren = (item: Item) => !!item[childrenKey]?.length;

function reachFrom(item: Item, reach: FoldReach): PrimaryKey[] {
	if (reach === 'siblings') {
		const parent = item[itemParent] ?? null;
		return internalItems.value
			.filter((other) => (other[itemParent] ?? null) === parent && hasChildren(other))
			.map((other) => other[props.itemKey]);
	}
	const byId = new Map(internalItems.value.map((other) => [other[props.itemKey], other]));
	const found = new Set<PrimaryKey>();
	const visit = (at: Item) => {
		for (const child of at[childrenKey] ?? []) {
			const childItem = byId.get(child);
			if (childItem && hasChildren(childItem) && !found.has(child)) {
				found.add(child);
				visit(childItem);
			}
		}
	};
	visit(item);
	return [...found];
}

/** Which way a click goes: the item's own way, or for everything inside, fold unless all are */
function foldsWith(item: Item, reach: FoldReach | null, targets: PrimaryKey[]) {
	if (reach !== 'inside')
		return !item[collapsedKey];
	const byId = new Map(internalItems.value.map((other) => [other[props.itemKey], other]));
	return targets.some((id) => !byId.get(id)?.[collapsedKey]);
}

const hoveredItem = computed(() =>
	hoveredChevron.value === null
		? null
		: internalItems.value.find((item) => item[props.itemKey] === hoveredChevron.value) ?? null,
);
const foldTargets = computed(
	() =>
		new Set(hoveredItem.value && reachHeld.value ? reachFrom(hoveredItem.value, reachHeld.value) : []),
);

function chevronHint(item: Item) {
	const reach = item[props.itemKey] === hoveredChevron.value ? reachHeld.value : null;
	if (reach === 'inside') {
		const targets = [...foldTargets.value];
		if (!targets.length)
			return 'Nothing inside to fold';
		return `${foldsWith(item, reach, targets) ? 'Fold' : 'Unfold'} everything inside`;
	}
	const verb = item[collapsedKey] ? 'Unfold' : 'Fold';
	if (reach === 'siblings')
		return `${verb} this and its siblings`;
	const modifiers = `${reachKeys.inside}-click: everything inside\n${reachKeys.siblings}-click: with its siblings`;
	return mergedHandle.value && !props.disabled ? `Drag to move\n${modifiers}` : modifiers;
}

function onChevronClick(item: Item, event: MouseEvent) {
	const reach = reachOf(event);
	if (!reach)
		return onToggleChildren(item);
	const targets = reachFrom(item, reach);
	if (targets.length)
		setCollapsed(targets, foldsWith(item, reach, targets));
}

function useTreeView({
	internalItems,
	parentField,
	itemKey,
	sortKey,
	showManualSort,
	collection,
	sortIsManual,
	controlIconWidth,
}: {
	internalItems: Ref<Item[]>;
	parentField: Ref<string | null>;
	itemKey: Ref<string>;
	sortKey: Ref<string | undefined>;
	showManualSort: Ref<boolean>;
	collection: Ref<string>;
	sortIsManual: ComputedRef<boolean>;
	controlIconWidth: number;
}) {
	const itemDepth = '--depth';
	const itemParent = '--parentId';
	const treeViewAble = computed(isTreeViewAble);
	const depthChangeMax = ref(0);
	const maxDepths = computed(getMaxDepths);
	const gridTemplateTreeColumnWidth = computed(calculateColumnWidth);

	const {
		childrenKey,
		collapsedKey,
		collapsedParentsKey,
		onToggleChildren,
		isCollapsed,
		initCollapsedChildren,
		setAllCollapsed,
		setCollapsed,
	} = useCollapsible();

	watch(() => props.items, initTreeView);
	watch(() => treeViewAble.value, initTreeView);
	watch(() => parentField.value, initTreeView);
	// A drawer (picking M2M items, say) can mount the table with its items and preset already there,
	// so none of the above ever fires and the rows stay flat until the tree is toggled off and on
	initTreeView();

	watch(() => parentField.value, resetIfNoParentSelected);

	return {
		gridTemplateTreeColumnWidth,
		depthChangeMax,
		itemDepth,
		itemParent,
		childrenKey,
		collapsedKey,
		collapsedParentsKey,
		onSortUpdate,
		onToggleChildren,
		setAllCollapsed,
		setCollapsed,
	};

	function resetIfNoParentSelected(
		newParentField: string | null,
		oldParentField: string | null,
	) {
		if (!newParentField && !!oldParentField)
			internalItems.value = props.items;
	}

	function initTreeView() {
		if (treeViewAble.value) {
			const { sortedResult, orderChanged } = reorder(
				// Shallow copies are enough, as only top-level keys are added or changed; deep-cloning
				// every item's relational data was a large part of the load time
				calculateTreeProps(internalItems.value.map((item) => ({ ...item }))),
			);

			internalItems.value = sortedResult;
			initCollapsedChildren();

			if (orderChanged)
				onSortUpdate({ sort: true, parent: null });
		}
	}

	function isTreeViewAble() {
		return (
			!!internalItems.value?.length
			&& !!parentField.value
			&& showManualSort.value
			&& !!sortKey.value
			&& sortIsManual.value
		);
	}

	// Only while the table is actually nesting: with manual sort off the rows are flat, and a reserve
	// for depths they aren't drawn at left a blank strip (or, shifted, a column widened by it)
	function calculateColumnWidth() {
		return treeViewAble.value ? maxDepths.value * controlIconWidth : 0;
	}

	function getMaxDepths() {
		return Math.max(
			...internalItems.value.map((item) => item[itemDepth] ?? 0),
			depthChangeMax.value,
		);
	}

	/** Calculates `[itemDepth]`, `[itemParent]` (id) and `[childrenKey]` */
	function calculateTreeProps(data: Item[]) {
		const map = {};

		for (const item of data) {
			item[itemParent] = getParentId(item);
			item[childrenKey] = [];
			item[collapsedKey] = isCollapsed(item[itemKey.value]);
			item[collapsedParentsKey] = [];

			map[item[itemKey.value]] = item;
		}

		for (const key in map) {
			const item = map[key];
			if (!(itemDepth in item))
				setDepth(item);
		}

		return Object.values(map) as Item[];

		function getParentId(item: Item) {
			if (!parentField.value)
				return null;

			return (
				item[parentField.value]?.[itemKey.value]
				?? item[parentField.value]
			);
		}

		function setDepth(item) {
			if (item[itemParent]) {
				const parentId = item[itemParent];

				if (map[parentId]) {
					const parentItem = map[parentId];

					if (!(itemDepth in parentItem)) {
						setDepth(parentItem);
					}

					item[itemDepth] = parentItem[itemDepth] + 1;
				}
			}
			else {
				item[itemDepth] = 0;
			}
		}
	}

	function reorder(items: Item[]) {
		let sortedResult: Item[] = [];
		let orderChanged = false;

		// Built once: filtering every item for each item's children was quadratic in the row count
		const childrenOf = new Map<PrimaryKey, Item[]>();
		for (const item of items) {
			const parent = item[itemParent];
			if (parent == null)
				continue;
			const siblings = childrenOf.get(parent);
			if (siblings)
				siblings.push(item);
			else childrenOf.set(parent, [item]);
		}

		const rootItems = items.filter((item) => item[itemDepth] === 0);
		rootItems.sort(sortBySortKey);
		rootItems.forEach(addItem);
		applySortValues();

		return { sortedResult, orderChanged };

		function applySortValues() {
			sortedResult = sortedResult.map((item: Item, index) => {
				const sortValue = index + 1;

				if (item[sortKey.value!] !== sortValue) {
					item[sortKey.value!] = sortValue;
					if (!orderChanged)
						orderChanged = true;
				}

				return item;
			});
		}

		function addItem(item: Item) {
			sortedResult.push(item);

			const children = [...(childrenOf.get(item[itemKey.value]) ?? [])];

			children.sort(sortBySortKey);

			for (const child of children) {
				item[childrenKey].push(child[itemKey.value]);
				const childrenIds = addItem(child);
				item[childrenKey].push(...childrenIds);
			}

			return item[childrenKey];
		}

		function sortBySortKey(a: Item, b: Item): number {
			return a[sortKey.value!] - b[sortKey.value!];
		}
	}

	interface SortUpdateParams {
		sort: boolean;
		parent: null | { id: PrimaryKey; parent: PrimaryKey | null };
	}

	function onSortUpdate({ sort, parent }: SortUpdateParams) {
		let edits = {};

		if (sort) {
			for (const item of internalItems.value) {
				edits[item[props.itemKey]] = {
					[props.manualSortKey!]: item[props.manualSortKey!],
				};
			}
		}

		if (parent && parentField.value) {
			edits = {
				...edits,
				[parent.id]: {
					...edits[parent.id],
					[parentField.value]:
                            parent.parent !== null ? { [itemKey.value]: parent.parent } : null,
				},
			};
		}

		emit('update:items', edits);
	}

	function useCollapsible() {
		const childrenKey = '--children';
		const collapsedKey = '--collapsed';
		const collapsedParentsKey = '--collapsed-parents';

		// Local rather than session storage, so folds last beyond the tab, as the layout's options do
		const collapsedState = useLocalStorage<PrimaryKey[]>(
			`${collection.value}--tree-view-collapsed-items`,
			[],
		);
		// Asked once per item on every load, so a set rather than searching the array each time
		const collapsedSet = computed(() => new Set(collapsedState.value));

		return {
			childrenKey,
			collapsedKey,
			collapsedParentsKey,
			onToggleChildren,
			isCollapsed,
			initCollapsedChildren,
			setAllCollapsed,
			setCollapsed,
		};

		/** Folds or unfolds these items together, then works out afresh which rows that hides */
		function setCollapsed(ids: PrimaryKey[], fold: boolean) {
			const targets = new Set(ids);
			const state = new Set(collapsedState.value);
			for (const id of targets)
				fold ? state.add(id) : state.delete(id);
			collapsedState.value = [...state];
			for (const item of internalItems.value) {
				if (targets.has(item[itemKey.value]))
					item[collapsedKey] = fold;
				item[collapsedParentsKey] = [];
			}
			initCollapsedChildren();
		}

		/** Only this page's items are known, so folding adds to what's stored rather than replacing it */
		function setAllCollapsed(fold: boolean) {
			if (!fold)
				collapsedState.value = [];
			setCollapsed(
				internalItems.value
					.filter((item) => item[childrenKey]?.length)
					.map((item) => item[itemKey.value] as PrimaryKey),
				fold,
			);
		}

		function isCollapsed(id: PrimaryKey) {
			return collapsedSet.value.has(id);
		}

		function onToggleChildren(item: Item) {
			if (!item[childrenKey]?.length)
				return;

			item[collapsedKey] = toggleItem(item[itemKey.value]);
			collapseChildren(item[itemKey.value], item[childrenKey]);
		}

		function toggleItem(id: PrimaryKey): boolean {
			const index = collapsedState.value.indexOf(id);

			if (index !== -1) {
				collapsedState.value.splice(index, 1);
				return false;
			}

			collapsedState.value.push(id);
			return true;
		}

		function initCollapsedChildren() {
			const byId = new Map(internalItems.value.map((item) => [item[itemKey.value], item]));
			collapsedState.value.forEach((collapsedId: PrimaryKey) => {
				const childrenIds = byId.get(collapsedId)?.[childrenKey];
				if (childrenIds)
					collapseChildren(collapsedId, childrenIds, byId);
			});
		}

		function collapseChildren(
			id: PrimaryKey,
			childrenIds: PrimaryKey[],
			byId = new Map(internalItems.value.map((item) => [item[itemKey.value], item])),
		) {
			for (const childItem of childrenIds.map((childId) => byId.get(childId)).filter(Boolean)) {
				const parentIndex =
                            childItem[collapsedParentsKey]?.indexOf(id);

				if (parentIndex > -1) {
					childItem[collapsedParentsKey].splice(
						parentIndex,
						1,
					);
				}
				else {
					childItem[collapsedParentsKey].push(id);
				}
			}
		}
	}
}
</script>

<template>
	<div
		class="v-table"
		:class="{ loading, inline, disabled }"
	>
		<table
			:summary="internalHeaders.map((header) => header.text).join(', ')"
			:class="{
				'tree-view': gridTemplateTreeColumnWidth > 0,
				'has-controls': columnStyleControlWidth > 0,
				'shifted': shiftedCount > 0,
				reshaping,
				'animate-folds': internalItems.length <= 300,
			}"
		>
			<TableHeader
				v-model:headers="internalHeaders"
				v-model:reordering="reordering"
				:sort="internalSort"
				:show-select="showSelect"
				:show-resize="showResize"
				:some-items-selected="someItemsSelected"
				:all-items-selected="allItemsSelected"
				:fixed="fixedHeader"
				:show-manual-sort="showManualSort"
				:must-sort="mustSort"
				:has-item-append-slot="hasItemAppendSlot"
				:manual-sort-key="manualSortKey"
				:allow-header-reorder="allowHeaderReorder"
				:tree-view="gridTemplateTreeColumnWidth > 0"
				:drawn-widths="drawnHeaderWidths"
				:all-folded="allFolded"
				:can-fold-all="foldableItems.length > 1"
				:hierarchy-available="!!parentField"
				@toggle-fold-all="setAllCollapsed(!allFolded)"
				@toggle-select-all="onToggleSelectAll"
				@update:sort="updateSort"
			>
				<template
					v-for="header in internalHeaders"
					#[`header.${header.value}`]
				>
					<slot
						:header="header"
						:name="`header.${header.value}`"
					/>
				</template>

				<template
					v-if="hasHeaderAppendSlot"
					#header-append
				>
					<slot name="header-append" />
				</template>

				<template
					v-if="hasHeaderContextMenuSlot"
					#header-context-menu="{ header }"
				>
					<slot
						name="header-context-menu"
						v-bind="{ header }"
					/>
				</template>
			</TableHeader>
			<thead
				v-if="loading"
				class="loading-indicator"
				:class="{ sticky: fixedHeader }"
			>
				<tr>
					<th
						scope="colgroup"
						:style="{ gridColumn: fullColSpan }"
					>
						<v-progress-linear
							v-if="loading"
							indeterminate
						/>
					</th>
				</tr>
			</thead>
			<tbody v-if="loading && items.length === 0">
				<tr class="loading-text">
					<td :style="{ gridColumn: fullColSpan }">
						{{ loadingText ?? $t("loading") }}
					</td>
				</tr>
			</tbody>
			<tbody v-if="!loading && items.length === 0">
				<tr class="no-items-text">
					<td :style="{ gridColumn: fullColSpan }">
						{{ noItemsText || $t("no_items") }}
					</td>
				</tr>
			</tbody>
			<tbody v-else>
				<Sortable
					v-slot="{
						item,
						selected: isSorting,
						parentSelected: parentSorting,
						onDragOver,
						currentDepth,
					}"
					v-model:items="internalItems"
					v-model:depth-change-max="depthChangeMax"
					:item-key
					:item-sort="manualSortKey"
					:item-depth
					:item-parent="!!parentField ? itemParent : null"
					:snap-step="controlIconWidth"
					:disabled="disabled || !sortIsManual"
					@manual-sort="onSortUpdate"
				>
					<TableRow
						:item
						:indent="currentDepth * controlIconWidth"
						:tree-view="gridTemplateTreeColumnWidth > 0"
						:style="rowGridColumns(currentDepth)"
						:sorting="isSorting || parentSorting"
						:has-children="item[childrenKey]?.length"
						:children-collapsed="item[collapsedKey]"
						:collapsed="!!item[collapsedParentsKey]?.length"
						:headers="internalHeaders"
						:show-select="disabled ? 'none' : showSelect"
						:show-manual-sort="!disabled && showManualSort"
						:is-selected="getSelectedState(item)"
						:subdued="loading || reordering"
						:sorted-manually="sortIsManual"
						:has-click-listener="!disabled && clickable"
						:height="rowHeight"
						@mouseover.prevent="onDragOver"
						:fold-target="foldTargets.has(item[itemKey])"
						:guides="guidesById.get(item[itemKey])"
						:divider-inset="guideJoins.insets.has(item[itemKey])"
						:guides-continue="guideJoins.continuing.has(item[itemKey])"
						:guide-corners="guideJoins.cornersBelow.get(item[itemKey])"
						:fold-hint="chevronHint(item)"
						@toggle-children="onChevronClick(item, $event)"
						@chevron-hover="onChevronHover(item, $event)"
						@click="
							!disabled && clickable
								? $emit('click:row', { item, event: $event })
								: null
						"
						@item-selected="
							onItemSelected({
								item,
								value: !getSelectedState(item),
							})
						"
					>
						<template
							v-for="header in internalHeaders"
							#[`item.${header.value}`]
						>
							<slot
								:item="item"
								:name="`item.${header.value}`"
							/>
						</template>

						<template
							v-if="hasItemAppendSlot"
							#item-append
						>
							<slot
								name="item-append"
								:item
							/>
						</template>
					</TableRow>
				</Sortable>
			</tbody>
		</table>
		<slot name="footer" />
	</div>
</template>

<style scoped>
    /*

	Available Variables:

		--v-table-sticky-offset-top  [0]
		--v-table-color              [var(--theme--foreground)]
		--v-table-background-color   [transparent]

*/

.v-table {
	position: relative;
	height: auto;
	overflow-y: auto;
}

table {
	min-width: 100%;
	border-collapse: collapse;
	border-spacing: 0;
}

table tbody {
	--grid-columns: v-bind(columnStyle.rows);

	display: contents;
}

table :deep(thead) {
	--grid-columns: v-bind(columnStyle.header);

	display: contents;
}

table :deep(td),
table :deep(th) {
	color: var(--v-table-color, var(--theme--foreground));
}

table :deep(tr),
table :deep(.loading-indicator) {
	display: grid;
	grid-template-columns: var(--grid-columns);
}

table :deep(td.align-left),
table :deep(th.align-left) {
	text-align: left;
	justify-content: start;
}

table :deep(td.align-center),
table :deep(th.align-center) {
	text-align: center;
	justify-content: center;
}

table :deep(td.align-right),
table :deep(th.align-right) {
	text-align: right;
	justify-content: end;
}

table :deep(.loading-indicator) {
	position: relative;
	z-index: 3;
}

table :deep(.loading-indicator > th) {
	margin-right: var(--content-padding);
}

table :deep(.sortable-ghost .cell) {
	background-color: var(--theme--background-subdued);
}

.loading table {
	pointer-events: none;
}

.loading .loading-indicator {
	height: auto;
	padding: 0;
	border: none;
}

.loading .loading-indicator .v-progress-linear {
	--v-progress-linear-height: 2px;
	--v-progress-linear-color: var(--theme--form--field--input--border-color-hover);

	position: absolute;
	top: -2px;
	left: 0;
	width: 100%;
}

.loading .loading-indicator th {
	padding: 0;
}

.loading .loading-indicator.sticky th {
	position: sticky;
	top: 48px;
	z-index: 2;
}

.loading-text,
.no-items-text {
	text-align: center;
	background-color: var(--theme--form--field--input--background);
}

.loading-text td,
.no-items-text td {
	padding: 16px;
	color: var(--theme--foreground-subdued);
}

.inline {
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.inline table :deep(.table-row:last-of-type .cell) {
	border-bottom: none;
}

.disabled {
	--v-table-color: var(--theme--foreground-subdued);
	--v-table-background-color: var(--theme--background-subdued);
}

table {
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

table.reshaping :deep(tr) {
	transition: grid-template-columns 160ms cubic-bezier(0.2, 0, 0, 1);
}

/* Header cells size their tracks by their own width, so they slide by it */
table.reshaping :deep(th) {
	transition: width 160ms cubic-bezier(0.2, 0, 0, 1);
}

/*
 * Folding slides rows shut and open. A folded row keeps its place at no height (see table-row), and
 * both heights are lengths, so it needs no interpolate-size; visibility flips at the right end by
 * itself. Height lays out every frame, so only for a page of rows.
 */
table.animate-folds :deep(.table-row) {
	/* Unfolding drops the folded row's own clip at once, so it would spill over the rows below. The
	   top is left open for the tree guides' corners, which reach up into the row above. */
	clip-path: inset(-6px 0 0 0);
	transition:
		height 150ms cubic-bezier(0.2, 0, 0, 1),
		opacity 150ms ease-out,
		visibility 150ms;
}

/* Both at once: one transition list, or the one written later would replace the other */
table.animate-folds.reshaping :deep(.table-row) {
	transition:
		height 150ms cubic-bezier(0.2, 0, 0, 1),
		opacity 150ms ease-out,
		visibility 150ms,
		grid-template-columns 160ms cubic-bezier(0.2, 0, 0, 1);
}

table.animate-folds :deep(.table-row.collapsed) {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	table.reshaping :deep(tr),
	table.reshaping :deep(th),
	table.animate-folds :deep(.table-row),
	table :deep(.collapse-btn) {
		transition: none;
	}
}

/* The first column starts right by the checkbox, so it needs only a sliver of padding */
table.has-controls :deep(tr > .cell:nth-child(2)) {
	padding-left: 4px;
}

table :deep(.cell.controls .manual),
table :deep(.cell.controls .select),
table :deep(.cell.controls .collapse) {
	margin: 0 2px;
}
table :deep(.depth-spacer) {
	width: v-bind(controlIconWidthCSS);
}
</style>
