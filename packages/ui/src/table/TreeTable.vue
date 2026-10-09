<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import type { ShowSelect } from './types';
import type { PrimaryKey } from './types';
import { placementTree, type Repeat } from '../tree';
import type { ComputedRef, Ref } from 'vue';
import type {
	Header,
	HeaderRaw,
	Item,
	ItemSelectEvent,
	Sort,
} from './types';
import { useEventListener } from './useEventListener';
import { clone, pick } from './utils';
import { useTableKit } from './kit';
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	provide,
	reactive,
	ref,
	shallowRef,
	toRaw,
	toRef,
	useSlots,
	watch,
} from 'vue';
import Sortable from './Sortable.vue';
import TableHeader from './TableHeader.vue';
import TableRow from './TableRow.vue';
import { useFolds } from './folds';

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
		/** The hierarchy to draw, its node ids the items' keys as strings; none draws the items flat */
		graph?: Graph | null;
		/** Every other placement of a node as a terminal duplicate, or in full as a mirror */
		repeat?: Repeat;
		/**
		 * Nested with nothing to drag. Directus nests only while sorted by the sort field, as that's
		 * when a drag can save; a view that can't be edited needn't wait for that.
		 */
		readonly?: boolean;
		/**
		 * The order comes from the hierarchy itself (a junction's own sort), so rows nest and can be
		 * dragged however the collection is sorted
		 */
		manualOrder?: boolean;
		/**
		 * While searching: the nodes that match, by id. The tree stays, rather than flattening to the
		 * matches: they're highlighted, every route from one up to the top shows (dimmed, as context),
		 * and the rest is hidden. Folds aren't touched, so clearing the search puts them back.
		 */
		matches?: Set<string> | null;
		/**
		 * While searching: show the routes to the matches (opened, the rest hidden), or keep the folds
		 * as they are, marking matches and saying how many a folded row holds
		 */
		searchMode?: 'routes' | 'inplace';
		/**
		 * Hide mode, for a filter (or a search) that should simply remove what doesn't match: only the
		 * nodes here stay, with the ancestors that hold their place (dimmed). Folds still apply and
		 * nothing is highlighted. Applied before any `matches`.
		 */
		keep?: Set<string> | null;
		/** A node to mark where it's drawn in full, as the playground marks its focus; Directus has none */
		current?: string | null;
		/** A node's name in a placement hint ("in Fruit"); the graph's labels if not given */
		nodeLabel?: (id: string) => string;
		collection: string;
		/**
		 * The column the hierarchy indents, by its key: it and every column before it move right with
		 * each level, and it gives up the indent's width so the columns after it stay in line (see
		 * `rowGridColumns`). Chosen by key rather than counted, so it stays the same column however the
		 * columns are reordered: usually the main text, which has room to give. Placement hints go in
		 * it too. Null: only the controls indent, as in Directus's own table; not shown: the first.
		 */
		treeColumn?: string | null;
		/** The faint lines from an open item's chevron down everything inside it */
		showGuides?: boolean;
		/** How many levels start open, below which items start folded; unset, everything starts open */
		openDepth?: number | null;
		/**
		 * The most levels Unfold all and a search's routes open; unset or negative, no limit. Deeper,
		 * the indent pushes every column after the tree column off screen. Opening one row, or going
		 * to one match, goes as deep as it needs.
		 */
		maxOpenDepth?: number | null;
		/** Folds animate: auto, while few enough rows are drawn to stay smooth */
		motion?: 'auto' | 'on' | 'off';
		/** A click selects the row rather than opening it; a double-click opens it */
		clickSelects?: boolean;
		/**
		 * The highlights come from a search, so a folded row counts the matches inside ("3 matches
		 * below"); from a filter alone it counts what unfolding it would show ("3 below")
		 */
		searching?: boolean;
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
		treeColumn: undefined,
		showGuides: true,
		openDepth: null,
		maxOpenDepth: null,
		motion: 'auto',
		clickSelects: false,
		searching: true,
		graph: null,
		repeat: 'once',
		readonly: false,
		matches: null,
		current: null,
		keep: null,
		searchMode: 'routes',
		manualOrder: false,
	},
);

/**
 * Rows are placements, not items: a node with two parents is two rows. Each row is its item's fields
 * plus a key for the placement (its route of node ids), which is what the folds, guides, fold
 * shortcuts and drag work by. Selection and clicks still go by the item's own key.
 */
const rowKey = '--key';

const emit = defineEmits([
	'click:row',
	'update:sort',
	'item-selected',
	'update:modelValue',
	'update:headers',
	'update:items',
	'showing',
	'match-position',
	'cursor',
]);

const { VProgressLinear, t, escapeTaken } = useTableKit();

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

				for (const [key, value] of Object.entries(header)) {
					if (value !== HeaderDefaults[key as keyof Header])
						keysThatAreNotAtDefaultValue.push(key);
				}

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

/** Once per selection rather than once per row: asked by every row each time the table redraws */
const selectedKeys = computed(() =>
	new Set(props.selectionUseKeys ? props.modelValue : props.modelValue.map((item) => item[props.itemKey])),
);
function getSelectedState(item: Item) {
	return selectedKeys.value.has(item[props.itemKey]);
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

/** Where the tree column is now: how many columns follow the hierarchy, and where hints go */
const treeColumnIndex = computed(() => {
	if (props.treeColumn === null)
		return -1;
	const index = internalHeaders.value.findIndex((header) => header.value === props.treeColumn);
	return index < 0 ? 0 : index;
});
const shiftedCount = computed(() =>
	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	nesting.value ? Math.min(treeColumnIndex.value + 1, internalHeaders.value.length) : 0,
);
/** The column a row's placement hint goes in: the tree column, which has the room, or the first */
const hintColumn = computed(() => internalHeaders.value[Math.max(0, treeColumnIndex.value)]?.value);

/**
 * Changing the shifted count slides the columns to their new widths. That lays out every row each
 * frame, so it's only for that moment (a resize drag stays instant) and only for a page of rows.
 */
const reshaping = ref(false);
let reshaped: ReturnType<typeof setTimeout> | undefined;

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
const mergedHandle = computed(() => props.showManualSort && nesting.value);

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
/** One style object per value: a new one, however alike, would redraw its row */
const gridStyles = new Map<string, { '--grid-columns': string }>();
function rowGridColumns(depth: number) {
	if (!shiftedCount.value)
		return undefined;
	const widths = drawnWidths.value.map((width, index) =>
		index === shiftedCount.value - 1 ? width - depth * controlIconWidth : width,
	);
	const columns = generate(widths, shiftedControlsWidth(depth));
	let style = gridStyles.get(columns);
	if (!style) {
		// A column resize makes new ones every frame
		if (gridStyles.size > 200)
			gridStyles.clear();
		gridStyles.set(columns, (style = { '--grid-columns': columns }));
	}
	return style;
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
	if (nesting.value)
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
/** The sizes every row reads, set once on the root rather than on each row */
const sizeVars = computed(() => ({
	'--tree-table-row-columns': columnStyle.value.rows,
	'--tree-table-header-columns': columnStyle.value.header,
	'--tree-table-row-height': `${props.rowHeight + 2}px`,
	'--tree-table-image-height': `${props.rowHeight - 16}px`,
	'--tree-table-leaf-mark-height': `${Math.round((props.rowHeight + 2) * 0.55)}px`,
}));

const internalItems = ref<Item[]>([]);

const sortIsManual = computed(
	() => internalSort.value.by === props.manualSortKey,
);

const {
	gridTemplateTreeColumnWidth,
	nesting,
	depthChangeMax,
	itemDepth,
	itemParent,
	childrenKey,
	isFolded,
	isFoldedAway,
	onSortUpdate,
	openTo,
	setCollapsed,
	resetFolds,
	ownFolds,
} = useTreeView({
	internalItems,
	graph: toRef(props, 'graph'),
	itemKey: toRef(props, 'itemKey'),
	sortKey: toRef(props, 'manualSortKey'),
	showManualSort: toRef(props, 'showManualSort'),
	collection: toRef(props, 'collection'),
	sortIsManual,
	controlIconWidth,
});

// Here rather than beside `reshaping`: the shifted count depends on `nesting`, from just above
watch(
	shiftedCount,
	() => {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		if (!animated.value)
			return;
		reshaping.value = true;
		clearTimeout(reshaped);
		reshaped = setTimeout(() => (reshaping.value = false), 200);
	},
);

/**
 * Tree guides: a faint line from under an open item's chevron down everything inside it, curving
 * at the bottom of the last row so it wraps the whole of it; curving mid-row made the last item look
 * half outside. Each row draws its share, a line for every ancestor, so the lines fold with the rows.
 * The lines that end there are always the innermost, so a row's share is counts: from the outermost
 * level, `through` lines going on down, then `ends` lines ending, then a stub if it's open itself.
 */
type Guides = { through: number; ends: number; stub: boolean };
/**
 * While searching, the rows on a route to a match: each matching placement and every placement
 * above it. Placement keys are routes, so the ones above are the key's prefixes.
 */
const searchRoutes = computed(() => {
	if (!props.matches || props.searchMode === 'inplace')
		return null;
	const keys = new Set<string>();
	const parents = new Set<string>();
	for (const row of internalItems.value) {
		if (!props.matches.has(row['--node']))
			continue;
		const path = String(row[rowKey]).split('/');
		for (let end = 1; end <= path.length; end++) {
			keys.add(path.slice(0, end).join('/'));
			if (end > 1)
				parents.add(path.slice(0, end - 1).join('/'));
		}
	}
	return { keys, parents };
});
/**
 * Folds made while the routes are shown, and rows opened past the cap: for the session of one search
 * only, so they never touch the folds kept for the tree.
 */
const searchFolds = reactive(new Set<string>());
const searchOpened = reactive(new Set<string>());
watch(() => props.matches, () => {
	searchFolds.clear();
	searchOpened.clear();
});
const openCap = computed(() => (props.maxOpenDepth == null || props.maxOpenDepth < 0 ? null : props.maxOpenDepth));
const depthOfKey = (key: string) => key.split('/').length - 1;
/** Showing the routes, whether a route row shows the route below it: not folded, and not past the cap unless opened */
const routeOpen = (key: string) =>
	!searchFolds.has(key) && (openCap.value === null || depthOfKey(key) < openCap.value || searchOpened.has(key));
const closedAbove = (key: string) => {
	const path = key.split('/');
	for (let end = 1; end < path.length; end++)
		if (!routeOpen(path.slice(0, end).join('/'))) return true;
	return false;
};
/** Opens rows: for this search only while its routes show, else in the folds kept for the tree */
function openRows(keys: string[]) {
	if (!searchRoutes.value)
		return setCollapsed(keys, false);
	for (const key of keys) {
		searchFolds.delete(key);
		searchOpened.add(key);
	}
}
/** With `keep`: the placements of kept nodes and every placement above them */
const keepKeys = computed(() => {
	if (!props.keep)
		return null;
	const keys = new Set<string>();
	for (const row of internalItems.value) {
		if (!props.keep.has(row['--node']))
			continue;
		const path = String(row[rowKey]).split('/');
		for (let end = 1; end <= path.length; end++) keys.add(path.slice(0, end).join('/'));
	}
	return keys;
});
/**
 * While searching or filtering, the items the rows show whatever the folds, as Directus counts items
 * whatever the page: the matches and what holds their place. A placement count would differ, and
 * only the rows know which ancestors a route runs through.
 */
const showing = computed(() => {
	if (!props.matches && !props.keep)
		return null;
	const wanted = props.matches ?? props.keep!;
	const items = new Set<string>();
	const matching = new Set<string>();
	for (const row of internalItems.value) {
		if ((keepKeys.value && !keepKeys.value.has(row[rowKey])) || (searchRoutes.value && !searchRoutes.value.keys.has(row[rowKey])))
			continue;
		items.add(row['--node']);
		if (wanted.has(row['--node']))
			matching.add(row['--node']);
	}
	return { items: items.size, matching: matching.size };
});
watch(showing, (counts) => emit('showing', counts), { immediate: true });
/** Hidden: dropped by `keep`; or off every route to a match while searching; or inside a fold */
const rowHidden = (item: Item) =>
	(!!keepKeys.value && !keepKeys.value.has(item[rowKey])) || rowHiddenBySearchOrFold(item);
const rowHiddenBySearchOrFold = (item: Item) =>
	searchRoutes.value
		? !searchRoutes.value.keys.has(item[rowKey]) || closedAbove(item[rowKey])
		: isFoldedAway(item);
/** Folded, as its chevron shows it: while searching, open exactly where a route runs through */
const rowFolded = (item: Item) =>
	searchRoutes.value
		? !searchRoutes.value.parents.has(item[rowKey]) || !routeOpen(item[rowKey])
		: isFolded(item);

/**
 * Whether folds animate. Moving rows lays out every row each frame, so auto counts the rows drawn:
 * in a small tree all of them (folded ones at no height), in a big one only those showing, as
 * hidden ones aren't drawn there. So a huge tree with a few rows open still animates.
 */
const visibleKeys = computed(() =>
	internalItems.value.length > 300
		? new Set(internalItems.value.filter((row) => !rowHidden(row)).map((row) => String(row[rowKey])))
		: null,
);
const animated = computed(() =>
	props.motion === 'on' || (props.motion === 'auto' && (visibleKeys.value?.size ?? internalItems.value.length) <= 300),
);
/**
 * In a big tree a fold would drop its rows at once, as only the rows showing are drawn: they stay a
 * moment, folding shut, then go. Rows that appear grow from nothing (`arriving`), once the table has
 * settled, so they don't all grow as it first draws.
 */
const leaving = shallowRef(new Set<string>());
let left: ReturnType<typeof setTimeout> | undefined;
watch(visibleKeys, (now, before) => {
	if (!now || !before || !animated.value)
		return;
	const gone = [...before].filter((key) => !now.has(key));
	if (!gone.length || gone.length > 300)
		return;
	leaving.value = new Set(gone);
	clearTimeout(left);
	left = setTimeout(() => (leaving.value = new Set()), 200);
});
const settled = ref(false);
watch(() => internalItems.value.length > 0, (has) => {
	if (has)
		setTimeout(() => (settled.value = true), 400);
}, { immediate: true });
/** Above 300 rows, only those not hidden are drawn. One function, as a new one would redraw them all */
const drawnOnly = computed(() => {
	if (internalItems.value.length <= 300)
		return undefined;
	const stay = leaving.value;
	return (item: Item) => !rowHidden(item) || stay.has(item[rowKey]);
});
/**
 * The rows that grow from nothing: new to the page, whether opened in a big tree or just added. Not
 * one the page had that has only moved, by a drag or a sort, or has a new key under a new parent:
 * the browser takes a moved row for a new one, and growing it afresh shifts the rows under a
 * pointer held still, which the drag then takes for a move.
 */
const arriving = shallowRef(new Set<string>());
let arrived: ReturnType<typeof setTimeout> | undefined;
watch(
	() => (animated.value && settled.value ? (drawnOnly.value ? internalItems.value.filter(drawnOnly.value) : [...internalItems.value]) : null),
	(now, before) => {
		if (!now || !before)
			return;
		const keys = new Set(before.map((row) => row[rowKey]));
		const nodes = new Set(before.map((row) => row['--node'] ?? row[rowKey]));
		const fresh = now.filter((row) => !keys.has(row[rowKey]) && !nodes.has(row['--node'] ?? row[rowKey]));
		if (!fresh.length)
			return;
		arriving.value = new Set(fresh.map((row) => String(row[rowKey])));
		clearTimeout(arrived);
		arrived = setTimeout(() => (arriving.value = new Set()), 200);
	},
);

/**
 * Hovering a row lights every placement of the same node: a class set straight on those few rows,
 * not reactive state, which would re-render every row of the table on every hover.
 */
function echo(node: string | undefined, on: boolean) {
	if (!node)
		return;
	for (const row of tableRoot.value?.querySelectorAll<HTMLElement>(`.table-row[data-node="${node.replace(/["\\]/g, '\\$&')}"]`) ?? [])
		row.toggleAttribute('data-echo', on);
}

/** Where a hint takes you: open the way to a row, scroll it into view and pulse it */
const tableRoot = ref<HTMLElement>();
async function goTo(key: string) {
	const path = key.split('/');
	const above = path.slice(0, -1).map((_, end) => path.slice(0, end + 1).join('/'));
	if (above.length) {
		setCollapsed(above, false);
		// Showing a search's routes, open it there too
		if (searchRoutes.value)
			openRows(above);
	}
	await nextTick();
	const row = tableRoot.value?.querySelector<HTMLElement>(`.table-row[data-key="${key.replace(/["\\]/g, '\\$&')}"]`);
	if (!row)
		return;
	row.scrollIntoView({ block: 'center', behavior: 'smooth' });
	row.classList.remove('flash');
	void row.offsetWidth;
	row.classList.add('flash');
	// Taken off once played, or every row ever gone to keeps it
	const played = (event: AnimationEvent) => {
		if (event.target !== row)
			return;
		row.classList.remove('flash');
		row.removeEventListener('animationend', played);
	};
	row.addEventListener('animationend', played);
}

/**
 * Enter in the search: the next match, or with `step` -1 the one before, through every placement of
 * a match in the order the rows run, as a browser's find goes through each occurrence. Its way
 * opens in the folds kept for the tree as well as the search's, so clearing the search lands on it.
 */
const matchRows = computed(() => {
	const wanted = props.matches ?? props.keep;
	if (!wanted)
		return [];
	return internalItems.value
		.filter((row) => wanted.has(row['--node']) && (!keepKeys.value || keepKeys.value.has(row[rowKey])))
		.map((row) => String(row[rowKey]));
});
const matchAt = ref<string | null>(null);
function goToMatch(step: 1 | -1 = 1) {
	const rows = matchRows.value;
	if (!rows.length)
		return;
	const at = matchAt.value === null ? -1 : rows.indexOf(matchAt.value);
	const next = at < 0 ? (step > 0 ? 0 : rows.length - 1) : (at + step + rows.length) % rows.length;
	matchAt.value = rows[next]!;
	cursor.value = rows[next]!;
	keyed.value = true;
	void goTo(rows[next]!);
}
watch([() => props.matches, () => props.keep], ([matches, keep], [hadMatches, hadKeep]) => {
	const last = matchAt.value;
	matchAt.value = null;
	// Cleared: land on the match last gone to, whose way is open in the folds kept
	if (!matches && !keep && (hadMatches || hadKeep) && last)
		void goTo(last);
});
watch([matchAt, matchRows], () => {
	const index = matchAt.value === null ? -1 : matchRows.value.indexOf(matchAt.value);
	emit('match-position', { at: index < 0 ? null : index + 1, of: matchRows.value.length });
}, { immediate: true });
/**
 * Esc lets go of the selected row from anywhere but a field being typed in, unless something open
 * takes it first: a menu, a dialog, the drawer this table picks in. Capturing, so that's as it was
 * before anything closed.
 */
const typing = (target: EventTarget | null) =>
	target instanceof HTMLElement
	&& (target.isContentEditable || target.matches('textarea, select, input:not([type=checkbox], [type=radio], [type=button])'));
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
	if (event.key === 'Escape' && cursor.value !== null && !typing(event.target) && !escapeTaken?.())
		cursor.value = null;
}, { capture: true });
/** A picker's ⌘Enter: ticks the selected row, if it shows and isn't ticked yet; false with none showing */
function pickCursor() {
	const row = cursorRow.value;
	if (!row || !(keyed.value || props.clickSelects) || props.showSelect === 'none')
		return false;
	if (!getSelectedState(row))
		onItemSelected({ item: row, value: true });
	return true;
}

/** Opens the selected row, even with nothing inside yet, so a child just given to it shows */
function unfoldCursor() {
	if (cursorRow.value)
		setRowOpen(cursorRow.value, true);
}

/** From the search, Esc: into the table at the selected row (or the first match showing), keys and all */
function focusTable() {
	if (cursor.value === null || !rowsByKey.value.has(cursor.value)) {
		const showing = visibleRows();
		const first = showing.find((row) => matchRows.value.includes(String(row[rowKey]))) ?? showing[0];
		cursor.value = first ? String(first[rowKey]) : null;
	}
	keyed.value = true;
	tableEl.value?.focus({ preventScroll: true });
}
defineExpose({ goToMatch, focusTable, pickCursor, unfoldCursor });

/**
 * Rows over a screen away are far, and drawn without their cells: unfolding a big tree builds a few
 * elements a row rather than every cell, and restyling the page, as Directus does whenever its
 * sidebar moves, doesn't restyle hundreds of rows no one can see. `content-visibility` would keep
 * them findable, but Gecko restyles what it skips; and on every row, rows scrolling into view were
 * drawn a moment late, visibly. A row starts far, and is measured as soon as it's in the page,
 * before anything's painted, so the rows in view never show empty; then the observer keeps it up.
 */
let farRows: IntersectionObserver | undefined;
/** What scrolls the table: from the window, that scroller's edge would cut the margin off */
let scroller: HTMLElement | null = null;
const farOf = new WeakMap<Element, Ref<boolean>>();
let measuring: Map<Element, Ref<boolean>> | null = null;
function measureRows() {
	const rows = measuring!;
	measuring = null;
	const view = scroller?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
	// As the observer's margin: a screen above and below
	const reach = view.bottom - view.top;
	for (const [row, far] of rows) {
		if (!row.isConnected)
			continue;
		const { top, bottom } = row.getBoundingClientRect();
		// Without an observer to bring it back, never
		far.value = !!farRows && (bottom < view.top - reach || top > view.bottom + reach);
		farRows?.observe(row);
	}
}
provide('table-rows', {
	added: (row: Element, far: Ref<boolean>) => {
		farOf.set(row, far);
		if (!measuring) {
			measuring = new Map();
			// Once every row this redraw adds is in, in one go: one layout, however many there are
			void nextTick(measureRows);
		}
		measuring.set(row, far);
	},
	removed: (row: Element) => farRows?.unobserve(row),
});
onMounted(() => {
	scroller = tableRoot.value?.parentElement ?? null;
	while (scroller && !/auto|scroll|overlay/.test(getComputedStyle(scroller).overflowY))
		scroller = scroller.parentElement;
	if (typeof IntersectionObserver === 'undefined')
		return;
	farRows = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				const far = farOf.get(entry.target);
				if (far)
					far.value = !entry.isIntersecting;
			}
		},
		{ root: scroller, rootMargin: '100% 0px' },
	);
});
onBeforeUnmount(() => farRows?.disconnect());

/** A hint was clicked: each does what its words promise rather than open the item */
function onHintClick(item: Item, kind: 'home' | 'loop' | 'count' | 'matches') {
	const key = String(item[rowKey]);
	const path = key.split('/');
	if (kind === 'count') {
		openRows([key, ...reachFrom(item, 'inside').map(String)]);
	}
	else if (kind === 'matches') {
		// Open the routes inside this row that lead to a match, and only those, however deep
		const wanted = props.matches ?? props.keep;
		const keys = new Set<string>([key]);
		for (const inside of item[childrenKey] ?? []) {
			if (!wanted?.has(rowsByKey.value.get(inside)?.['--node']) || (keepKeys.value && !keepKeys.value.has(inside)))
				continue;
			const parts = String(inside).split('/');
			for (let end = path.length; end < parts.length; end++) keys.add(parts.slice(0, end).join('/'));
		}
		openRows([...keys]);
	}
	else if (kind === 'loop') {
		void goTo(path.slice(0, path.indexOf(item['--node']) + 1).join('/'));
	}
	else {
		const full = internalItems.value.find((row) => row['--node'] === item['--node'] && row['--full']);
		if (full)
			void goTo(full[rowKey]);
	}
}
const rowsByKey = computed(() => new Map(internalItems.value.map((row) => [String(row[rowKey]), row])));

/**
 * The selected row: a cursor the arrow keys move once the table has focus, and in click-selects
 * mode the row a click picks. Directus's table has none; its checkboxes are for batch actions.
 */
const cursor = ref<string | null>(null);
const tableEl = ref<HTMLTableElement>();
/** Moved by the keyboard since the last click, so the cursor is shown even where a click opens */
const keyed = ref(false);
const cursorRow = computed(() => (cursor.value === null ? null : rowsByKey.value.get(cursor.value) ?? null));
watch(cursorRow, (row) => emit('cursor', row));
// Gone in a reload or a move: nothing selected rather than a row that isn't there
watch(rowsByKey, (rows) => {
	if (cursor.value !== null && !rows.has(cursor.value))
		cursor.value = null;
});
const visibleRows = () => internalItems.value.filter((row) => !rowHidden(row));

function onRowClick(item: Item, event: MouseEvent) {
	cursor.value = String(item[rowKey]);
	// ⌥/Alt-clicked, a row is selected rather than opened, wherever a click opens
	keyed.value = event.altKey;
	// A row's mousedown starts a drag, which keeps the browser from focusing the table itself
	tableEl.value?.focus({ preventScroll: true });
	if (!props.clickSelects && !event.altKey && !props.disabled && props.clickable)
		emit('click:row', { item, event });
}
function onRowDoubleClick(item: Item, event: MouseEvent) {
	if (props.clickSelects && !props.disabled && props.clickable)
		emit('click:row', { item, event });
}

/** Opens or folds one row, for this search only while its routes show */
function setRowOpen(item: Item, open: boolean) {
	if (!searchRoutes.value)
		return setCollapsed([item[rowKey]], !open);
	const key = String(item[rowKey]);
	if (open) {
		openRows([key]);
	}
	else {
		searchFolds.add(key);
		searchOpened.delete(key);
	}
}

/** The arrow keys walk the rows showing, → and ← open and fold (or step in and out), Enter opens */
function onTableKey(event: KeyboardEvent) {
	if (event.target !== tableEl.value || event.altKey || event.metaKey || event.ctrlKey)
		return;
	const rows = visibleRows();
	if (!rows.length)
		return;
	const at = rows.findIndex((row) => row[rowKey] === cursor.value);
	const item = at < 0 ? null : rows[at]!;
	let next: Item | undefined;
	switch (event.key) {
		case 'ArrowDown':
			next = rows[Math.min(rows.length - 1, at + 1)];
			break;
		case 'ArrowUp':
			next = rows[Math.max(0, at - 1)];
			break;
		case 'Home':
			next = rows[0];
			break;
		case 'End':
			next = rows.at(-1);
			break;
		case 'PageDown':
			next = rows[Math.min(rows.length - 1, Math.max(0, at) + 10)];
			break;
		case 'PageUp':
			next = rows[Math.max(0, at - 10)];
			break;
		case 'ArrowRight':
			if (item && hasChildren(item) && rowFolded(item))
				setRowOpen(item, true);
			else if (item && rows[at + 1]?.[itemParent] === item[rowKey])
				next = rows[at + 1];
			else if (!item)
				next = rows[0];
			break;
		case 'ArrowLeft':
			if (item && hasChildren(item) && !rowFolded(item))
				setRowOpen(item, false);
			else if (item)
				next = rows.find((row) => row[rowKey] === item[itemParent]);
			break;
		case 'Enter':
			if (item && !props.disabled && props.clickable)
				emit('click:row', { item, event });
			break;
		case ' ':
			if (item && props.showSelect !== 'none')
				onItemSelected({ item, value: !getSelectedState(item) });
			break;
		default:
			return;
	}
	event.preventDefault();
	keyed.value = true;
	if (!next)
		return;
	cursor.value = String(next[rowKey]);
	void nextTick(() =>
		tableRoot.value?.querySelector(`.table-row[data-key="${cursor.value!.replace(/["\\]/g, '\\$&')}"]`)?.scrollIntoView({ block: 'nearest' }),
	);
}


/** The row being dragged and the parent it would land under now: its guides are drawn from there */
const held = ref<{ key: PrimaryKey; parent: PrimaryKey | null } | null>(null);

const guidesById = computed(() => {
	const guides = new Map<PrimaryKey, Guides>();
	// Not while searching: they follow the folds, and the search shows its own rows
	if (!props.showGuides || !nesting.value || searchRoutes.value)
		return guides;
	const byId = new Map(internalItems.value.map((item) => [item[rowKey], item]));
	const landing = held.value;
	const parentOf = (item: Item) => (landing && item[rowKey] === landing.key ? landing.parent : item[itemParent]);
	const lastChild = new Map<PrimaryKey, PrimaryKey>();
	for (const item of internalItems.value) {
		if (byId.has(parentOf(item)))
			lastChild.set(parentOf(item), item[rowKey]);
	}
	// By its ancestors on this page, each worked out once: walking every row's whole route was
	// quadratic in the depth, and a fully unfolded big tree runs a hundred levels deep
	const depths = new Map<PrimaryKey, number>();
	const lastRuns = new Map<PrimaryKey, number>();
	const depthOf = (key: PrimaryKey): number => {
		let depth = depths.get(key);
		if (depth === undefined) {
			const parent = parentOf(byId.get(key)!);
			depths.set(key, (depth = byId.has(parent) ? depthOf(parent) + 1 : 0));
		}
		return depth;
	};
	/** How many of it and its ancestors in turn are the last row inside their parent */
	const lastRun = (key: PrimaryKey): number => {
		let run = lastRuns.get(key);
		if (run === undefined) {
			const parent = parentOf(byId.get(key)!);
			lastRuns.set(key, (run = byId.has(parent) && lastChild.get(parent) === key ? lastRun(parent) + 1 : 0));
		}
		return run;
	};
	// Whether a row holds others as it will once the held row lands: the row it lands in gains one
	// (and opens), the row it left may lose its only one
	const opensAs = (item: Item) => {
		const inside: string[] = item[childrenKey] ?? [];
		if (!landing || item[rowKey] === landing.key)
			return inside.length > 0 && !isFolded(item);
		if (item[rowKey] === landing.parent)
			return true;
		return inside.some((key) => key !== landing.key && !key.startsWith(`${landing.key}/`)) && !isFolded(item);
	};
	for (const item of internalItems.value) {
		const key = item[rowKey];
		const open = opensAs(item);
		// A closed row ends the line of each ancestor it's the last row of, all the way out
		const ends = open ? 0 : lastRun(key);
		guides.set(key, { through: depthOf(key) - ends, ends, stub: open });
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
		if (isFoldedAway(item))
			continue;
		const guides = guidesById.value.get(item[rowKey]);
		if (ended) {
			continuing.add(ended.id);
			cornersBelow.set(item[rowKey], ended.levels);
			// Its depth as its guides have it, which for a dragged row is where it would land
			if (Math.min(...ended.levels) === (guides ? guides.through + guides.ends : (item[itemDepth] ?? 0)))
				insets.add(item[rowKey]);
		}
		const levels = guides ? Array.from({ length: guides.ends }, (_, end) => guides.through + end) : [];
		ended = levels.length ? { id: item[rowKey], levels } : null;
	}
	// The last row's guides curve onto the table's bottom border, so it starts where the outermost
	// one ends, as a divider does: its column's middle (level * 28 + 14) plus the curve's reach (12)
	const footInset = ended ? `${Math.min(...ended.levels) * 28 + 26}px` : null;
	return { continuing, cornersBelow, insets, footInset };
});

const foldableItems = computed(() => internalItems.value.filter((item) => item[childrenKey]?.length));
/** Every item with children on this page folded, so the header's chevron unfolds rather than folds */
const allFolded = computed(
	() => foldableItems.value.length > 0 && foldableItems.value.every(isFolded),
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
useEventListener(window, 'keydown', (event: KeyboardEvent) => (reachHeld.value = reachOf(event)));
useEventListener(window, 'keyup', (event: KeyboardEvent) => (reachHeld.value = reachOf(event)));
// Released while the window was in the background, the keyup never comes
useEventListener(window, 'blur', () => (reachHeld.value = null));

function onChevronHover(item: Item, event: PointerEvent | null) {
	hoveredChevron.value = event ? item[rowKey] : null;
	if (event)
		reachHeld.value = reachOf(event);
}

const hasChildren = (item: Item) => !!item[childrenKey]?.length;

function reachFrom(item: Item, reach: FoldReach): PrimaryKey[] {
	if (reach === 'siblings') {
		const parent = item[itemParent] ?? null;
		return internalItems.value
			.filter((other) => (other[itemParent] ?? null) === parent && hasChildren(other))
			.map((other) => other[rowKey]);
	}
	// Everything inside it, as its children key holds every placement below, not only the next level
	return (item[childrenKey] ?? []).filter((key: PrimaryKey) => {
		const inside = rowsByKey.value.get(String(key));
		return !!inside && hasChildren(inside);
	});
}

/**
 * A word after a row's first cell about its placement: where a duplicate's full placement lives (as
 * ICD-11 greys an entry whose home is elsewhere), that a loop's is above it, and how many distinct
 * nodes a folded row holds (as OLS counts them), so it's clear whether to open it.
 */
function makeHint(item: Item): Hint | null {
	const graph = props.graph;
	if (!graph || !item['--node'])
		return null;
	const label = (id: string) => props.nodeLabel?.(id) ?? graph.label(id);
	if (item['--loop'])
		return { text: 'above', kind: 'loop', tip: 'A loop: this is one of its own ancestors, so it isn\'t drawn again here. Click to go to it.' };
	if (item['--full'] === false) {
		return item['--home']
			? { text: `in ${label(item['--home'])}`, kind: 'home', tip: `Also under ${label(item['--home'])}, where it's shown in full. Click to go there.` }
			: { text: 'at the top', kind: 'home', tip: 'Shown in full at the top level. Click to go there.' };
	}
	if (!item[childrenKey]?.length || !rowFolded(item))
		return null;
	// Searching, what's inside is counted in matches, as they're what's being looked for
	const wanted = props.searching ? props.matches ?? props.keep : null;
	if (wanted) {
		const inside = new Set<string>();
		for (const key of item[childrenKey] as string[]) {
			const node = rowsByKey.value.get(key)?.['--node'];
			if (wanted.has(node) && (!keepKeys.value || keepKeys.value.has(key)))
				inside.add(node);
		}
		if (!inside.size)
			return null;
		const [them, items] = inside.size === 1 ? ['it', 'item'] : ['them', 'items'];
		return { text: `${inside.size} ${inside.size === 1 ? 'match' : 'matches'} below`, kind: 'matches', tip: `${inside.size} matching ${items} inside. Click to open the way to ${them}.` };
	}
	// Else what unfolding it would show: a filter's hiding the rest is its point, not news
	const count = keepKeys.value || searchRoutes.value ? shownInside(item) : graph.descendantCount(item['--node']);
	if (!count)
		return null;
	return { text: `${count} below`, kind: 'count', tip: `${count} distinct ${count === 1 ? 'item' : 'items'} inside, however many routes reach them. Click to unfold them all.` };
}

/** The distinct items inside a row that a filter leaves showing, however many routes reach them */
function shownInside(item: Item) {
	const nodes = new Set<string>();
	for (const key of item[childrenKey] as string[]) {
		if ((!keepKeys.value || keepKeys.value.has(key)) && (!searchRoutes.value || searchRoutes.value.keys.has(key)))
			nodes.add(rowsByKey.value.get(key)?.['--node']);
	}
	return nodes.size;
}

type Hint = { text: string; kind: 'home' | 'loop' | 'count' | 'matches'; tip: string };
/** The hint each row was last given, handed back while it says the same so the row isn't redrawn */
const hintsGiven = new Map<string, Hint>();
function hintOf(item: Item) {
	const hint = makeHint(item);
	const key = String(item[rowKey]);
	const given = hintsGiven.get(key);
	if (hint && given && given.text === hint.text && given.kind === hint.kind && given.tip === hint.tip)
		return given;
	if (hint)
		hintsGiven.set(key, hint);
	else hintsGiven.delete(key);
	return hint;
}

/**
 * The header's chevron: fold everything; all folded, unfold to the cap, or ⌘/Ctrl-clicked, all of it.
 * ⌥/Alt-clicked, back to the depth the view starts at.
 */
function onFoldAll(event?: MouseEvent) {
	if (event?.altKey)
		return resetFolds();
	if (!allFolded.value)
		return openTo(0);
	openTo(event?.metaKey || event?.ctrlKey ? null : openCap.value);
}
/** Folded rows that unfolding to the cap would leave shut: only then is there more for ⌘-click */
const foldedPastCap = computed(() => openCap.value !== null && foldableItems.value.some((item) => (item[itemDepth] ?? 0) >= openCap.value!));
const foldAllTip = computed(() => {
	const lines = [!allFolded.value ? 'Fold all' : foldedPastCap.value ? `Unfold to ${openCap.value} levels` : 'Unfold all'];
	if (allFolded.value && foldedPastCap.value)
		lines.push(`${reachKeys.inside}-click: all of them`);
	if (ownFolds.value)
		lines.push(`${reachKeys.siblings}-click: ${props.openDepth == null ? 'unfold everything' : `fold to ${props.openDepth} ${props.openDepth === 1 ? 'level' : 'levels'}`}`);
	return lines.join('\n');
});

/** Which way a click goes: the item's own way, or for everything inside, fold unless all are */
function foldsWith(item: Item, reach: FoldReach | null, targets: PrimaryKey[]) {
	if (reach !== 'inside')
		return !isFolded(item);
	return targets.some((id) => {
		const row = rowsByKey.value.get(String(id));
		return !!row && !isFolded(row);
	});
}

const hoveredItem = computed(() =>
	hoveredChevron.value === null ? null : rowsByKey.value.get(String(hoveredChevron.value)) ?? null,
);
const foldTargets = computed(
	() =>
		new Set(hoveredItem.value && reachHeld.value ? reachFrom(hoveredItem.value, reachHeld.value) : []),
);

function chevronHint(item: Item) {
	const reach = item[rowKey] === hoveredChevron.value ? reachHeld.value : null;
	if (reach === 'inside') {
		const targets = [...foldTargets.value];
		if (!targets.length)
			return 'Nothing inside to fold';
		return `${foldsWith(item, reach, targets) ? 'Fold' : 'Unfold'} everything inside`;
	}
	const verb = isFolded(item) ? 'Unfold' : 'Fold';
	if (reach === 'siblings')
		return `${verb} this and its siblings`;
	const modifiers = `${reachKeys.inside}-click: everything inside\n${reachKeys.siblings}-click: with its siblings`;
	return mergedHandle.value && !props.disabled ? `Drag to move\n${modifiers}` : modifiers;
}

function onChevronClick(item: Item, event: MouseEvent) {
	// Showing a search's routes, a fold lasts only as long as the search
	if (searchRoutes.value) {
		const key = String(item[rowKey]);
		if (rowFolded(item)) {
			openRows([key]);
		}
		else {
			searchFolds.add(key);
			searchOpened.delete(key);
		}
		return;
	}
	const reach = reachOf(event);
	if (!reach) {
		if (item[childrenKey]?.length)
			setCollapsed([item[rowKey]], !isFolded(item));
		return;
	}
	const targets = reachFrom(item, reach);
	if (targets.length)
		setCollapsed(targets, foldsWith(item, reach, targets));
}

function useTreeView({
	internalItems,
	graph,
	itemKey,
	sortKey,
	showManualSort,
	collection,
	sortIsManual,
	controlIconWidth,
}: {
	internalItems: Ref<Item[]>;
	graph: Ref<Graph | null>;
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
		isFolded,
		isFoldedAway,
		openTo,
		setCollapsed,
		resetFolds,
		ownFolds,
	} = useCollapsible();

	watch(() => props.items, initTreeView);
	watch(() => treeViewAble.value, initTreeView);
	watch(() => graph.value, initTreeView);
	watch(() => props.repeat, initTreeView);
	// A drawer (picking M2M items, say) can mount the table with its items and preset already there,
	// so none of the above ever fires and the rows stay flat until the tree is toggled off and on
	initTreeView();


	return {
		gridTemplateTreeColumnWidth,
		/**
		 * Whether the table draws the hierarchy at all. Not the indent's width: with every row folded
		 * only the top level shows, the indent is nothing, and the table is still a tree.
		 */
		nesting: treeViewAble,
		depthChangeMax,
		itemDepth,
		itemParent,
		childrenKey,
		isFolded,
		isFoldedAway,
		onSortUpdate,
		openTo,
		setCollapsed,
		resetFolds,
		ownFolds,
	};

	function initTreeView() {
		if (!treeViewAble.value) {
			// Flat, every item is one row, keyed by its own key
			internalItems.value = props.items.map((item) => ({ ...item, [rowKey]: String(item[itemKey.value]) }));
			return;
		}
		internalItems.value = placementRows();
		if (!props.manualOrder && sortValuesOutOfStep())
			save({ sort: true, parent: null });
	}

	function isTreeViewAble() {
		return (
			!!props.items?.length
			&& !!graph.value
			&& (props.readonly || props.manualOrder || (showManualSort.value && !!sortKey.value && sortIsManual.value))
		);
	}

	// Only while the table is actually nesting: with manual sort off the rows are flat, and a reserve
	// for depths they aren't drawn at left a blank strip (or, shifted, a column widened by it)
	function calculateColumnWidth() {
		return treeViewAble.value ? maxDepths.value * controlIconWidth : 0;
	}

	/**
	 * The deepest row showing, not the deepest row: folded rows stay in the page, and a deep branch
	 * folded out of sight would otherwise widen the column for every row, pushing the rest off screen
	 */
	function getMaxDepths(): number {
		return Math.max(
			0,
			...internalItems.value
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				.filter((item) => !rowHidden(item))
				.map((item) => item[itemDepth] ?? 0),
			depthChangeMax.value,
		);
	}

	/**
	 * A row per placement, in the order the rows run, each its item's fields (shallow copies are
	 * enough, as only keys of the row's own are added; deep-cloning every item's relational data was
	 * a large part of the load time) with the placement's: its key, its parent placement, its depth
	 * and every placement below it, which is what folding hides.
	 */
	function placementRows(): Item[] {
		const byId = new Map(props.items.map((item) => [String(item[itemKey.value]), item]));
		return placementTree(graph.value!, props.repeat)
			.filter((placement) => byId.has(placement.id))
			.map((placement) => ({
				...byId.get(placement.id),
				[rowKey]: placement.key,
				'--node': placement.id,
				[itemParent]: placement.parentKey,
				[itemDepth]: placement.depth,
				[childrenKey]: placement.descendants,
				'--full': placement.full,
				'--mirror': placement.mirror,
				'--loop': placement.loop,
				'--home': placement.home,
			}));
	}

	/**
	 * The rows' order only needs the sort values rising down them, not numbering 1, 2, 3, so a gap, or
	 * a page that starts further on, is no reason to save anything. Only an item with none, or out of
	 * step with the rows (a branch sorted apart from its parent), needs a move. Duplicates are left out:
	 * an item's own sort value only places it where it's drawn in full.
	 */
	function sortValuesOutOfStep() {
		let last = -Infinity;
		for (const row of internalItems.value) {
			if (!row['--full'])
				continue;
			const value = row[sortKey.value!];
			if (typeof value !== 'number' || value <= last)
				return true;
			last = value;
		}
		return false;
	}

	interface SortUpdateParams {
		sort: boolean;
		parent: null | { id: PrimaryKey; parent: PrimaryKey | null };
		dragged?: PrimaryKey | null;
		link?: boolean;
	}

	/**
	 * The items' new order and the dragged placement's move, in the items' own keys; the layout works
	 * out what to save. A row's key is its route, so the parent it was dragged from is the one before
	 * it in its key, however the rows have been rearranged since.
	 */
	function save({ sort, parent, dragged, link }: SortUpdateParams) {
		const rows = new Map(internalItems.value.map((row) => [row[rowKey], row]));
		const draggedRow = dragged == null ? undefined : rows.get(dragged);
		const keyOf = (key: PrimaryKey | null) => (key === null ? null : (rows.get(key)?.[itemKey.value] ?? null));
		const from = parent ? (String(parent.id).split('/').at(-2) ?? null) : null;
		const moved = parent ? rows.get(parent.id) : undefined;
		emit('update:items', {
			order: sort ? [...new Set(internalItems.value.map((row) => row[itemKey.value] as PrimaryKey))] : null,
			parent: moved && parent && graph.value
				? {
						id: moved[itemKey.value] as PrimaryKey,
						parent: keyOf(parent.parent),
						from: from === null ? null : (props.items.find((item) => String(item[itemKey.value]) === from)?.[itemKey.value] ?? null),
					}
				: null,
			// The same move in node ids, for a `GraphEditor`: the placement under `from` went to
			// position `index` among `to`'s children
			moved: draggedRow && graph.value ? { ...moveOf(draggedRow, rows), link: !!link } : null,
		});
	}

	function moveOf(dragged: Item, rows: Map<string, Item>) {
		const siblings = internalItems.value.filter((row) => row !== dragged && row[itemParent] === dragged[itemParent]);
		const position = internalItems.value.indexOf(dragged);
		const after = siblings.findIndex((row) => internalItems.value.indexOf(row) > position);
		return {
			node: dragged['--node'] as string,
			from: String(dragged[rowKey]).split('/').at(-2) ?? null,
			to: (rows.get(dragged[itemParent])?.['--node'] as string | undefined) ?? null,
			index: after < 0 ? siblings.length : after,
		};
	}

	/** A drop: the rows are already where they were dropped; the new graph redraws them once saved */
	function onSortUpdate(update: SortUpdateParams) {
		// Dropped into a row, that row opens: one past the starting depth would fold it away
		if (update.parent?.parent != null)
			setCollapsed([update.parent.parent], false);
		save(update);
	}

	function useCollapsible() {
		const childrenKey = '--children';

		const { folds } = useFolds(collection.value);

		/**
		 * Which rows are folded, and which a fold above hides, in one pass down the rows: a parent's
		 * row always comes before its children's. Worked out here rather than marked on each row, as
		 * marking every row inside every fold made each fold cost a reactive write per row and level.
		 */
		const foldState = computed(() => {
			const folded = new Set<PrimaryKey>();
			const hidden = new Set<PrimaryKey>();
			if (!treeViewAble.value)
				return { folded, hidden };
			// Every change replaces the folds whole, so reading them raw tracks them once rather than per row
			const own = toRaw(folds.value.rows);
			const depth = startDepth();
			for (const item of internalItems.value) {
				const key = item[rowKey];
				const parent = item[itemParent];
				if (parent != null && (folded.has(parent) || hidden.has(parent)))
					hidden.add(key);
				if (item[childrenKey]?.length && (own[key] ?? isCollapsedByDepth(item, depth)))
					folded.add(key);
			}
			return { folded, hidden };
		});

		return {
			childrenKey,
			isFolded: (item: Item) => foldState.value.folded.has(item[rowKey]),
			isFoldedAway: (item: Item) => foldState.value.hidden.has(item[rowKey]),
			openTo,
			setCollapsed,
			// Back to the starting depth: every fold of your own forgotten
			resetFolds: () => (folds.value = { rows: {} }),
			ownFolds: computed(() => folds.value.depth !== undefined || Object.keys(folds.value.rows).length > 0),
		};

		/** Folds or unfolds these items together, storing only where that differs from the starting depth */
		function setCollapsed(ids: PrimaryKey[], fold: boolean) {
			const targets = new Set(ids);
			const rows = { ...folds.value.rows };
			for (const item of internalItems.value) {
				if (!targets.has(item[rowKey]))
					continue;
				delete rows[item[rowKey]];
				if (isCollapsedByDepth(item) !== fold)
					rows[item[rowKey]] = fold;
			}
			folds.value = { ...folds.value, rows };
		}

		/** The depth everything was last opened to, or else `openDepth`; null, all of it */
		function startDepth() {
			return folds.value.depth !== undefined ? folds.value.depth : props.openDepth;
		}

		/** Levels shallower than the starting depth are open */
		function isCollapsedByDepth(item: Item, depth = startDepth()) {
			return depth != null && (item[itemDepth] ?? 0) >= depth;
		}

		/** Everything open down to `depth` (null: all of it) and folded below, whatever was folded before */
		function openTo(depth: number | null) {
			folds.value = { depth, rows: {} };
		}
	}
}
</script>

<template>
	<div
		ref="tableRoot"
		class="v-table"
		:class="{ loading, inline, disabled, 'click-selects': clickSelects, keyed, 'alt-held': reachHeld === 'siblings' }"
		:style="sizeVars"
	>
		<!-- Focused itself for the keyboard: Directus draws the wrapper as display: contents, which can't be -->
		<table
			ref="tableEl"
			:tabindex="nesting ? 0 : undefined"
			:summary="internalHeaders.map((header) => header.text).join(', ')"
			@keydown="onTableKey"
			:class="{
				'tree-view': nesting,
				'has-controls': columnStyleControlWidth > 0,
				'shifted': shiftedCount > 0,
				reshaping,
				'animate-folds': animated,
				settled,
				'foot-inset': guideJoins.footInset,
			}"
			:style="guideJoins.footInset ? { '--foot-inset': guideJoins.footInset } : null"
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
				:tree-view="nesting"
				:drawn-widths="drawnHeaderWidths"
				:all-folded="allFolded"
				:fold-all-tip="foldAllTip"
				:can-fold-all="foldableItems.length > 1"
				:hierarchy-available="!!graph"
				@toggle-fold-all="onFoldAll"
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
						{{ loadingText ?? t("loading") }}
					</td>
				</tr>
			</tbody>
			<tbody v-if="!loading && items.length === 0">
				<tr class="no-items-text">
					<td :style="{ gridColumn: fullColSpan }">
						{{ noItemsText || t("no_items") }}
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
					v-model:held="held"
					:item-key="rowKey"
					:shown="drawnOnly"
					:root="animated ? tableRoot : null"
					:hidden="rowHidden"
					:item-sort="manualSortKey ?? ''"
					:item-depth
					:item-parent="graph ? itemParent : null"
					:snap-step="controlIconWidth"
					:disabled="disabled || !(sortIsManual || manualOrder)"
					@manual-sort="onSortUpdate"
				>
					<TableRow
						:item
						:indent="currentDepth * controlIconWidth"
						:tree-view="nesting"
						:style="rowGridColumns(currentDepth)"
						:sorting="isSorting || parentSorting"
						:has-children="item[childrenKey]?.length"
						:children-collapsed="rowFolded(item)"
						:collapsed="rowHidden(item)"
						:match="!!matches?.has(item['--node'])"
						:current="!!current && item['--node'] === current && item['--full'] !== false"
						:context="(!!searchRoutes && !matches?.has(item['--node'])) || (!!keep && !keep.has(item['--node']))"
						@mouseenter="echo(item['--node'], true)"
						@mouseleave="echo(item['--node'], false)"
						@hint-click="onHintClick(item, $event)"
						:headers="internalHeaders"
						:show-select="disabled ? 'none' : showSelect"
						:show-manual-sort="!disabled && showManualSort"
						:is-selected="getSelectedState(item)"
						:subdued="loading || reordering"
						:sorted-manually="sortIsManual || manualOrder"
						:has-click-listener="!disabled && clickable"
						@mouseover.prevent="onDragOver"
						:class="arriving.has(item[rowKey]) ? 'arriving' : undefined"
						:fold-target="foldTargets.has(item[rowKey])"
						:guide-through="guidesById.get(item[rowKey])?.through"
						:guide-ends="guidesById.get(item[rowKey])?.ends"
						:guide-stub="guidesById.get(item[rowKey])?.stub"
						:divider-inset="guideJoins.insets.has(item[rowKey])"
						:guides-continue="guideJoins.continuing.has(item[rowKey])"
						:guide-corners="guideJoins.cornersBelow.get(item[rowKey])"
						:fold-hint="chevronHint(item)"
						:hint="hintOf(item)"
						:hint-column="hintColumn"
						:duplicate="item['--full'] === false"
						:cell-slots="slots"
						:cursor="cursor === item[rowKey]"
						:tools="cursor === item[rowKey] && (clickSelects || keyed)"
						@toggle-children="onChevronClick(item, $event)"
						@chevron-hover="onChevronHover(item, $event)"
						@click="onRowClick(item, $event)"
						@dblclick="onRowDoubleClick(item, $event)"
						@item-selected="
							onItemSelected({
								item,
								value: !getSelectedState(item),
							})
						"
					/>
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

/* Set on the table's root (see `sizeVars`) rather than with v-bind(), which runs a query over the
   whole page each time the component holding it redraws */
table tbody {
	--grid-columns: var(--tree-table-row-columns);

	display: contents;
}

table :deep(thead) {
	--grid-columns: var(--tree-table-header-columns);

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

table.foot-inset {
	border-bottom-color: transparent;
	background-image: linear-gradient(var(--theme--border-color-subdued), var(--theme--border-color-subdued));
	background-repeat: no-repeat;
	background-position: var(--foot-inset) 100%;
	background-size: calc(100% - var(--foot-inset)) var(--theme--border-width);
	background-origin: border-box;
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
	   top is left open for the tree guides' corners, which reach up into the row above, and the
	   bottom by a border for the last row's curve onto the table's border. */
	clip-path: inset(-6px 0 calc(-1 * var(--theme--border-width)) 0);
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

/*
 * The selected row: always in click-selects mode, otherwise once the keyboard (or Enter in the
 * search) has moved it. A ring rather than a fill, as matches are filled and so is hover.
 */
/* The selected row shows where the keyboard is, so the table itself needs no focus ring. With its
   class, to outweigh Directus's own ring, a selector made heavy with :not()s */
table.tree-view:focus,
table.tree-view:focus-visible {
	outline: none;
	box-shadow: none;
}

.v-table.click-selects :deep(.table-row.cursor),
.v-table.keyed :deep(.table-row.cursor) {
	position: relative;
}

.v-table.click-selects :deep(.table-row.cursor)::after,
.v-table.keyed :deep(.table-row.cursor)::after {
	content: '';
	position: absolute;
	inset: 1px 2px;
	border: 2px solid var(--theme--primary);
	border-radius: var(--theme--border-radius);
	pointer-events: none;
}

/* Holding ⌥ where a click opens: the row a click would select instead, previewed. Not over a
   chevron or handle, where ⌥-click folds the row and its siblings */
.v-table.alt-held:not(.click-selects) :deep(.table-row:not(.cursor):hover:not(:has(.collapse-btn:hover, .drag-handle:hover))) {
	position: relative;
}

.v-table.alt-held:not(.click-selects) :deep(.table-row:not(.cursor):hover:not(:has(.collapse-btn:hover, .drag-handle:hover)))::after {
	content: '';
	position: absolute;
	inset: 1px 2px;
	border: 2px solid var(--theme--primary);
	border-radius: var(--theme--border-radius);
	opacity: 0.45;
	pointer-events: none;
}

@starting-style {
	table.animate-folds.settled :deep(.table-row.arriving) {
		height: 0;
		opacity: 0;
	}
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
</style>
