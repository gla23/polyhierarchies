<script setup lang="ts">
import type { ModelRef, Ref } from 'vue';
import { computed, nextTick, provide, ref } from 'vue';

    type Item = Record<string, any>;
    type ItemID = string | number;
interface SortUpdateParams {
	sort: boolean;
	/** Only when the drop changed the dragged row's parent */
	parent: { id: ItemID; parent: ItemID | null } | null;
	/** The row that was dragged, whether or not its parent changed */
	dragged: ItemID | null;
	/** Dropped with Alt held: add the new parent rather than move from the old one */
	link: boolean;
}

const { itemKey, itemSort, itemDepth, itemParent, snapStep, disabled, shown, hidden, root } =
        defineProps<{
        	itemKey: string;
        	itemSort: string;
        	itemDepth: string;
        	itemParent: string | null;
        	snapStep: number;
        	disabled?: boolean;
        	/** Which rows to draw; all, if not given. The rest stay in `items`, and move with a drag */
        	shown?: (item: Item) => boolean;
        	/** Folded away: moved down past a folded row, a row lands after what it holds, not in it */
        	hidden?: (item: Item) => boolean;
        	/** Where the rows are drawn, to slide those a drag pushes aside; without it they jump */
        	root?: HTMLElement | null;
        }>();

/** Drawn rows only: thousands of hidden ones cost a render each for nothing */
const drawn = computed(() => (shown ? items.value!.filter(shown) : items.value!));

const emit = defineEmits(['manual-sort']);

const items = defineModel<Item[]>('items');

const depthChangeMax = defineModel<number>('depthChangeMax', {
	default: 0,
});

const nestable = computed(() => itemParent !== null);

const { draggedChildrenIds, onSortStart, onDragOver, isSorting, getDepth } =
        useSortable({ items: items as ModelRef<Item[]>, depthChangeMax, snapStep, nestable });

provide('sortable', { onSortStart, nestable });

function useSortable({
	items,
	depthChangeMax,
	snapStep,
	nestable,
}: {
	items: ModelRef<Item[]>;
	depthChangeMax: ModelRef<number>;
	snapStep: number;
	nestable: Ref<boolean>;
}) {
	const draggedItemId = ref<ItemID | null>(null);
	const targetItemId = ref<ItemID | null>(null);
	const draggedItemIndex = computed(getDraggedItemIndex);
	const draggedChildren = computed(getDraggedChildren);

	const draggedChildrenIds = computed<ItemID[]>(
		() => draggedChildren.value?.map((item) => item[itemKey]) ?? [],
	);
	// Asked by every row on every render while dragging
	const draggedChildrenSet = computed(() => new Set(draggedChildrenIds.value));

	const draggedChildrenCount = computed(
		() => draggedChildren.value?.length ?? 0,
	);

	const draggedItemDepthOffset = ref(0);
	/** Each sliding row's end, put off when a new move starts it sliding again */
	const settling = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
	const initialX = ref(0);
	const intendedDepthChange = ref(0);

	return {
		draggedChildrenIds,
		onSortStart,
		onDragOver,
		isSorting,
		getDepth,
	};

	function isSorting(id: ItemID) {
		return draggedItemId.value === id;
	}

	function getDepth(item: Item) {
		if (!nestable.value)
			return 0;

		return (
			item[itemDepth]
			+ (item[itemKey] === draggedItemId.value
				|| draggedChildrenSet.value.has(item[itemKey])
				? draggedItemDepthOffset.value
				: 0)
		);
	}

	function getDraggedChildren(): Item[] {
		if (!draggedItemId.value || !nestable.value)
			return [];

		// Built once: filtering every item at each level was quadratic in a deep branch
		const childrenOf = new Map<ItemID, Item[]>();
		for (const item of items.value) {
			const siblings = childrenOf.get(item[itemParent!]);
			if (siblings)
				siblings.push(item);
			else childrenOf.set(item[itemParent!], [item]);
		}

		return getChildren(draggedItemId.value);

		function getChildren(id: ItemID): Item[] {
			const children = childrenOf.get(id) ?? [];
			return [...children, ...children.flatMap((child) => getChildren(child[itemKey]))];
		}
	}

	function getDraggedItemIndex(): number | null {
		const index = items.value.findIndex(
			(item: Item) => item[itemKey] === draggedItemId.value,
		);

		return index !== -1 ? index : null;
	}

	function getCurrentDepth() {
		if (draggedItemIndex.value === null || !nestable.value)
			return 0;
		return items.value[draggedItemIndex.value]![itemDepth];
	}

	function onSortStart(item: Item, event: MouseEvent) {
		if (disabled)
			return;

		initialX.value = event.clientX;
		draggedItemId.value = item[itemKey];
		intendedDepthChange.value = getCurrentDepth();

		document.addEventListener('mousemove', onSortMove);
		document.addEventListener('mouseup', onSortEnd);
	}

	function onSortMove(e: MouseEvent) {
		if (!nestable.value)
			return;

		const deltaX = e.clientX - initialX.value;
		const rawSnapDepth = Math.round(deltaX / snapStep);
		const currentDepth = getCurrentDepth();

		draggedItemDepthOffset.value = between({
			min: getMinDepth() - currentDepth,
			max: getMaxDepth() - currentDepth,
			value: rawSnapDepth,
		});

		intendedDepthChange.value =
                currentDepth + draggedItemDepthOffset.value;

		depthChangeMax.value =
                getMaxCurrentDepthWithChildren() + draggedItemDepthOffset.value;

		function getMaxCurrentDepthWithChildren() {
			if (!draggedChildrenCount.value)
				return currentDepth;
			return Math.max(
				...draggedChildren.value.map((item) => item[itemDepth]),
			);
		}

		function getMinDepth(): number {
			if (draggedItemIndex.value === 0)
				return 0;

			const maxIndex = items.value?.length - 1;

			const nextIndex =
                    draggedItemIndex.value! + 1 + draggedChildrenCount.value;

			if (nextIndex > maxIndex)
				return 0;

			return items.value[nextIndex]![itemDepth];
		}

		function getMaxDepth(): number {
			const parentIndex = draggedItemIndex.value! - 1;

			if (parentIndex < 0)
				return 0;

			const parentDepth = items.value[parentIndex]![itemDepth];

			return parentDepth + 1;
		}

		function between({ min, max, value }: { min: number; max: number; value: number }) {
			return Math.min(Math.max(value, min), max);
		}
	}

	function onDragOver(id: ItemID) {
		// Its own rows move with it, so they're under the pointer often, and never a place to go
		if (!draggedItemId.value || draggedItemId.value === id || draggedChildrenSet.value.has(id))
			return;

		const draggingIndex = items.value.findIndex(
			(item) => item[itemKey] === draggedItemId.value,
		);

		const dragOverIndex = items.value.findIndex(
			(item) => item[itemKey] === id,
		);

		if (draggingIndex === -1 || dragOverIndex === -1)
			return;

		targetItemId.value = id;

		slideRows(() => moveItem(draggingIndex, dragOverIndex));

		function moveItem(draggingIndex: number, dragOverIndex: number) {
			const itemsToMove = items.value.splice(
				draggingIndex,
				1 + draggedChildrenCount.value,
			);

			// Going down it lands just after the row, which moved up by as many rows as it took out (at
			// the row's old index it would land that many rows further), and after whatever's folded
			// away in it: just inside, the row below would be one of those, as deep, and it'd nest
			let to = dragOverIndex;
			if (dragOverIndex > draggingIndex) {
				to = dragOverIndex - itemsToMove.length + 1;
				while (hidden && to < items.value.length && hidden(items.value[to]!))
					to++;
			}
			items.value.splice(to, 0, ...itemsToMove);
		}
	}

	/**
	 * Slides the rows a move pushes aside from where they were to where they land (FLIP, a transform
	 * only); the dragged rows stay under the pointer. A row on its way can't be hovered: passing under
	 * a pointer held still, it would be taken for a new place to move to, and moved back.
	 */
	function slideRows(move: () => void) {
		const drawnRows = () => [...(root?.querySelectorAll<HTMLElement>('.table-row[data-key]') ?? [])];
		const before = drawnRows();
		if (!before.length || matchMedia('(prefers-reduced-motion: reduce)').matches)
			return move();
		// Where each shows now, partway along an earlier slide included, so a new one carries on from it
		const was = new Map(before.map((row) => [row.dataset.key!, row.getBoundingClientRect().top]));
		move();
		void nextTick(() => {
			const moved = drawnRows().flatMap((row) => {
				const key = row.dataset.key!;
				const from = was.get(key);
				if (from === undefined || key === String(draggedItemId.value) || draggedChildrenSet.value.has(key))
					return [];
				const by = from - row.getBoundingClientRect().top;
				return Math.abs(by) < 1 ? [] : [{ row, by }];
			});
			if (!moved.length)
				return;
			// Every start, one reflow, then every end: not a reflow per row
			for (const { row, by } of moved) {
				row.style.transition = 'none';
				row.style.transform = `translateY(${by}px)`;
				row.style.pointerEvents = 'none';
			}
			void moved[0]!.row.offsetHeight;
			for (const { row } of moved) {
				row.style.transition = 'transform 150ms cubic-bezier(0.2, 0, 0, 1)';
				row.style.transform = '';
				clearTimeout(settling.get(row));
				settling.set(row, setTimeout(() => {
					row.style.transition = '';
					row.style.pointerEvents = '';
				}, 160));
			}
		});
	}

	function onSortEnd(event?: MouseEvent) {
		const updates: SortUpdateParams = {
			sort: !!targetItemId.value,
			parent: null,
			dragged: draggedItemId.value,
			link: !!event?.altKey,
		};

		if (nestable.value) {
			updateDepth();
			updateDraggedChildrenDepth();
			updateParent();
		}

		updateSort();
		reset();
		emit('manual-sort', updates);

		function updateDepth() {
			items.value[draggedItemIndex.value!]![itemDepth] =
                    intendedDepthChange.value;
		}

		function updateDraggedChildrenDepth() {
			if (draggedChildrenIds.value) {
				for (const childId of draggedChildrenIds.value) {
					const child = items.value.find(
						(item) => item[itemKey] === childId,
					);

					if (!child)
						continue;

					child[itemDepth] += draggedItemDepthOffset.value;
				}
			}
		}

		function updateParent() {
			let parentId = null;
			let parentIndex = draggedItemIndex.value! - 1;

			while (
				parentIndex >= 0
				&& items.value[parentIndex]![itemDepth]
				>= intendedDepthChange.value
			) {
				parentIndex--;
			}

			if (parentIndex >= 0) {
				parentId = items.value[parentIndex]![itemKey];
			}

			if (
				items.value[draggedItemIndex.value!]![itemParent!]
				!== parentId
			) {
				items.value[draggedItemIndex.value!]![itemParent!] =
                        parentId;

				updates.parent = {
					id: items.value[draggedItemIndex.value!]![itemKey!],
					parent: parentId,
				};
			}
		}

		function updateSort() {
			items.value.map((item, index) => (item[itemSort] = index + 1));
		}

		function reset() {
			document.removeEventListener('mousemove', onSortMove);
			document.removeEventListener('mouseup', onSortEnd);

			// initialX.value = 0; // not necessary
			draggedItemDepthOffset.value = 0;
			intendedDepthChange.value = 0;
			depthChangeMax.value = 0;
			draggedItemId.value = null;
			targetItemId.value = null;
		}
	}
}
</script>

<template>
	<slot
		v-for="item in drawn"
		:key="item[itemKey]"
		:item="item"
		:selected="isSorting(item[itemKey])"
		:parent-selected="draggedChildrenIds?.includes(item[itemKey])"
		:on-drag-over="() => onDragOver(item[itemKey])"
		:current-depth="getDepth(item)"
	/>
</template>
