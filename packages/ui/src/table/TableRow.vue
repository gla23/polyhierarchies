<script setup lang="ts">
import type { ShowSelect } from './types';
import type { FunctionalComponent, Ref, Slot, Slots } from 'vue';
// CORE CHANGES
// import type { Header, Item } from "./types";
import type { Header, Item } from './types';
import { useTableKit } from './kit';
import { inject, onBeforeUnmount, onMounted, ref } from 'vue';

const props = withDefaults(
	defineProps<{
		headers: Header[];
		item: Item;
		indent?: number;
		sorting?: boolean;
		childrenCollapsed?: boolean;
		collapsed?: boolean;
		hasChildren?: boolean;
		/** The table nests, so every row keeps a chevron slot */
		treeView?: boolean;
		/** Will fold or unfold with a ⌘ or ⌥ click on the hovered chevron */
		foldTarget?: boolean;
		/** What clicking the chevron does, with or without a modifier held */
		foldHint?: string;
		/**
		 * This row's share of the tree's guide lines, by level from the outermost: so many going on
		 * through it, then so many ending in it, then one from under its own chevron if it's open
		 */
		guideThrough?: number;
		guideEnds?: number;
		guideStub?: boolean;
		/** Its top divider starts where the guide curving into it ends */
		dividerInset?: boolean;
		/** Its guides that end go on into the next row, which draws their curves */
		guidesContinue?: boolean;
		/** The levels of the guides from the row above that curve onto this row's divider */
		guideCorners?: number[];
		showSelect: ShowSelect;
		showManualSort?: boolean;
		isSelected?: boolean;
		subdued?: boolean;
		sortedManually?: boolean;
		hasClickListener?: boolean;
		/**
		 * The table's own slots, `item.<column>` and `item-append`, drawn here by name: as slots of the
		 * row's they'd be forwarded, and Vue redraws every row with forwarded slots whenever anything
		 * above it redraws (Directus does, a few times each time its sidebar opens)
		 */
		cellSlots?: Slots;
		/** A word on the row's placement, after its first cell: where a duplicate lives, how much a fold holds */
		hint?: { text: string; kind: 'home' | 'loop' | 'count' | 'matches'; tip?: string } | null;
		/** The column the hint goes in: the tree column, the one with room to spare */
		hintColumn?: string;
		/** Drawn in full somewhere else: dimmed, a pointer rather than the item itself */
		duplicate?: boolean;
		/** The table's selected row (see the table's cursor) */
		cursor?: boolean;
		/** Draws the table's `row-tools` slot after its name: the selected row, while it shows as selected */
		tools?: boolean;
		/** Matches the search */
		match?: boolean;
		/** The node the host is looking at, in its full placement */
		current?: boolean;
		/** Shown while searching only as part of a route to a match */
		context?: boolean;
	}>(),
	{
		indent: 0,
		showSelect: 'none',
		showManualSort: false,
		isSelected: false,
		subdued: false,
		sortedManually: false,
		hasClickListener: false,
		treeView: false,
	},
);

// The pointer events too: declared, a new listener from the table doesn't count as a change to redraw for
const emit = defineEmits(['click', 'dblclick', 'item-selected', 'toggle-children', 'chevron-hover', 'hint-click', 'mouseenter', 'mouseleave', 'mouseover']);

// Told to the table, which says whether the row is far off screen (see its farRows)
const tableRows = inject<{ added: (row: Element, far: Ref<boolean>) => void; removed: (row: Element) => void } | null>('table-rows', null);
const rowElement = ref<HTMLElement>();
/** Far off screen: the row's box, which keeps its height, but no cells. Far until measured. */
const far = ref(!!tableRows);
onMounted(() => rowElement.value && tableRows?.added(rowElement.value, far));
onBeforeUnmount(() => rowElement.value && tableRows?.removed(rowElement.value));

const SlotOf: FunctionalComponent<{ render: Slot; item: Item }> = ({ render, item }) => render({ item });

const { VCheckbox, VIcon, VTextOverflow, ValueNull, vTooltip } = useTableKit();

const { onSortStart, nestable } = inject('sortable') as {
	onSortStart: (item: Item, event: MouseEvent) => void;
	nestable: Ref<boolean>;
};

const { onMouseDown, onClick } = usePreventClickAfterDragging({
	mouseDownHandler: onSortStart,
	clickHandler: (event: MouseEvent) => emit('click', event),
});

/**
 * The merged chevron starts a drag only once the pointer has moved, as a plain click on the handle
 * already runs a whole sort (renumbering every row) and folding shouldn't. The click that ends a
 * drag is ignored, so letting go never folds.
 */
let chevronDragged = false;

function onChevronMouseDown(down: MouseEvent) {
	if (down.button !== 0)
		return;
	// As the handle does, so dragging doesn't select text; the click still comes
	down.preventDefault();
	const move = (moved: MouseEvent) => {
		if (Math.hypot(moved.clientX - down.clientX, moved.clientY - down.clientY) < 4)
			return;
		chevronDragged = true;
		stop();
		// From where the press began, so the sideways drag that nests measures from there
		onMouseDown(props.item, down);
	};
	const up = () => {
		stop();
		setTimeout(() => (chevronDragged = false), 0);
	};
	const stop = () => {
		document.removeEventListener('mousemove', move);
		document.removeEventListener('mouseup', up);
	};
	document.addEventListener('mousemove', move);
	document.addEventListener('mouseup', up);
}

function onChevronClick(event: MouseEvent) {
	if (!chevronDragged)
		emit('toggle-children', event);
}

function usePreventClickAfterDragging({
	mouseDownHandler,
	clickHandler,
}: {
	mouseDownHandler: (item: Item, event: MouseEvent) => void;
	clickHandler: (event: MouseEvent) => void;
}) {
	let dragging = false;

	return {
		onMouseDown,
		onClick,
	};

	function onMouseDown(item: Item, event: MouseEvent) {
		dragging = true;
		mouseDownHandler(item, event);

		document.addEventListener('mouseup', onMouseUp);

		function onMouseUp() {
			document.removeEventListener('mouseup', onMouseUp);
			// this does the trick
			setTimeout(() => (dragging = false), 0);
		}
	}

	function onClick(event: MouseEvent) {
		if (dragging)
			return;
		clickHandler(event);
	}
}
</script>

<template>
	<tr
		ref="rowElement"
		class="table-row"
		:data-node="item['--node']"
		:data-key="item['--key']"
		:class="{
			subdued,
			clickable: hasClickListener,
			sorting,
			collapsed,
			duplicate,
			match,
			context,
			current,
			cursor,
		}"
		@click="onClick"
		@dblclick="emit('dblclick', $event)"
		@mouseenter="emit('mouseenter', $event)"
		@mouseleave="emit('mouseleave', $event)"
		@mouseover="emit('mouseover', $event)"
	>
		<template v-if="!far">
			<td
				class="cell controls"
				:style="indent > 0 ? { paddingLeft: `${indent}px` } : null"
			>
				<!-- A held row's too: they're worked out from where it would land -->
				<span
					v-if="guideThrough"
					class="guide through"
					:style="{ width: `calc(${(guideThrough - 1) * 28}px + var(--theme--border-width))` }"
				/>
				<span
					v-for="end in guideEnds"
					:key="end"
					class="guide end"
					:class="{ continues: guidesContinue }"
					:style="{ left: `${(guideThrough! + end - 1) * 28 + 14}px` }"
				/>
				<span
					v-if="guideStub"
					class="guide stub"
					:style="{ left: `${(guideThrough! + guideEnds!) * 28 + 14}px` }"
				/>
				<span
					v-for="level in guideCorners"
					:key="`corner-${level}`"
					class="guide corner"
					:style="{ left: `${level * 28 + 14}px` }"
				/>
				<div
					class="cell-style"
					:class="{ 'divider-inset': dividerInset }"
				>
					<!-- First, so a leaf's empty slot reads as indentation rather than a gap before its content -->
					<span
						v-if="treeView"
						class="chevron-slot"
					>
						<!-- A real button, which a v-icon with a click listener isn't: reachable by Tab and Vimium -->
						<button
							v-if="hasChildren"
							v-tooltip="foldHint"
							type="button"
							class="collapse-btn"
							:class="{
								'children-collapsed': childrenCollapsed,
								'fold-target': foldTarget,
								'movable': showManualSort && sortedManually,
							}"
							:aria-label="childrenCollapsed ? 'Unfold' : 'Fold'"
							:aria-expanded="!childrenCollapsed"
							@mousedown="showManualSort && onChevronMouseDown($event)"
							@click.stop="onChevronClick"
							@pointerenter="$emit('chevron-hover', $event)"
							@pointermove="$emit('chevron-hover', $event)"
							@pointerleave="$emit('chevron-hover', null)"
						>
							<v-icon name="expand_more" />
						</button>
						<v-icon
							v-else-if="showManualSort"
							name="drag_handle"
							class="drag-handle manual"
							:class="{ 'sorted-manually': sortedManually, nestable }"
							@click.stop
							@mousedown.prevent="onMouseDown(item, $event)"
						/>
						<span
							v-else
							class="leaf-mark"
						/>
					</span>
					<v-icon
						v-if="showManualSort && !treeView"
						name="drag_handle"
						class="drag-handle manual"
						:class="{ 'sorted-manually': sortedManually, nestable }"
						@click.stop
						@mousedown.prevent="onMouseDown(item, $event)"
					/>

					<v-checkbox
						v-if="showSelect !== 'none'"
						class="select"
						:icon-on="
							showSelect === 'one'
								? 'radio_button_checked'
								: undefined
						"
						:icon-off="
							showSelect === 'one'
								? 'radio_button_unchecked'
								: undefined
						"
						:model-value="isSelected"
						@click.stop
						@update:model-value="$emit('item-selected', $event)"
					/>

				</div>
			</td>

			<td
				v-for="header in headers"
				:key="header.value"
				class="cell"
				:class="[`align-${header.align}`, { placed: header.value === hintColumn && hint }]"
			>
				<SlotOf
					v-if="cellSlots?.[`item.${header.value}`]"
					:render="cellSlots[`item.${header.value}`]!"
					:item
				/>
				<template v-else>
					<v-text-overflow
						v-if="
							header.value.split('.').reduce((acc, val) => {
								return acc[val];
							}, item)
						"
						:text="
							header.value.split('.').reduce((acc, val) => {
								return acc[val];
							}, item)
						"
					/>
					<value-null v-else />
				</template>
				<!-- A button: it does something of its own (see the table's onHintClick), not open the item -->
				<button
					v-if="header.value === hintColumn && hint"
					v-tooltip="hint.tip"
					type="button"
					class="placement-hint"
					:class="hint.kind"
					@click.stop="emit('hint-click', hint.kind)"
				>
					{{ hint.text }}
				</button>
				<span
					v-if="tools && header.value === hintColumn && cellSlots?.['row-tools']"
					class="row-tools"
					@click.stop
					@dblclick.stop
				>
					<SlotOf :render="cellSlots['row-tools']" :item />
				</span>
			</td>

			<td class="spacer cell" />
			<td
				v-if="cellSlots?.['item-append']"
				class="append cell"
				@click.stop
			>
				<SlotOf :render="cellSlots['item-append']" :item />
			</td>
		</template>
	</tr>
</template>

<style lang="scss" scoped>
/* The host's focus: a bar where the row's indent ends and a faint tint, so it's findable without
   competing with selection */
.table-row.current {
	--v-table-background-color: var(--theme--background-subdued);
}

.table-row.current .cell.controls .cell-style {
	box-shadow: inset 3px 0 var(--theme--primary);
}

.placement-hint:hover {
	color: var(--theme--primary);
}

/* Taken to a row by a hint: a brief pulse, so the eye finds it */
.table-row.flash {
	animation: row-flash 900ms ease-out;
}

@keyframes row-flash {
	from {
		opacity: 0.3;
	}
}

/* Another placement of the row being hovered: lit as the hover is */
.table-row[data-echo] .cell:not(.controls),
.table-row[data-echo] .cell.controls .cell-style {
	background-color: var(--theme--background-subdued);
}

/* Searching: the matches stand out, and the rows that only lead to them step back. The tint starts
   where the row's indent ends, as the hover's does, so the guides' column stays clear. */
.table-row.match .cell:not(.controls),
.table-row.match .cell.controls .cell-style {
	background-color: var(--theme--primary-background);
}

.table-row.match .cell:not(.controls) {
	font-weight: 600;
}

.table-row.context .cell:not(.controls) > :not(.v-menu),
.table-row.context .cell:not(.controls) > :deep(.v-menu > .v-menu-activator > *) {
	opacity: 0.6;
}

/* A duplicate points at the full placement elsewhere, so it reads as quieter than the real thing,
   handle and all. A menu (a display's list of related items) is dimmed through what's in it: Directus
   gives the menu and its activator no box, which takes no opacity */
.table-row.duplicate .cell:not(.controls) > :not(.v-menu),
.table-row.duplicate .cell:not(.controls) > :deep(.v-menu > .v-menu-activator > *),
.table-row.duplicate .drag-handle {
	opacity: 0.55;
}

.placement-hint {
	padding: 0;
	font: inherit;
	background: none;
	border: none;
	cursor: pointer;
	/* Gives way long before the cell's own content does: the name matters more than the count */
	flex-shrink: 1000;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	margin-left: 8px;
	font-size: 12px;
	white-space: nowrap;
	color: var(--theme--foreground-subdued);
}

.placement-hint.loop {
	color: var(--theme--warning);
}

/* Except the way to a search's matches, which matters more than the end of a name */
.placement-hint.matches {
	flex-shrink: 0;
}

/* The selected row's actions, after its name, which gives way to them */
.row-tools {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: 2px;
	margin-left: 8px;
}

/* Still shrinks, once the hint has gone, so a long name ends in an ellipsis rather than overflowing */
.cell.placed > :first-child {
	min-width: 0;
}

.table-row.duplicate .cell:not(.controls) > .placement-hint {
	opacity: 1;
}

/* Except where the full placement is, the one thing on the row worth reading */
.table-row.duplicate .placement-hint.home:not(:hover) {
	color: var(--theme--foreground);
}

.chevron-slot {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 28px;
}

/* Down the middle of the chevron's column, from the top of the row to past its bottom, so a run of
   rows draws one unbroken line, in the dividers' colour so a curve joins its divider as one stroke */
.guide {
	position: absolute;
	width: 0;
	border-left: var(--theme--border-width) solid var(--theme--border-color-subdued);
	pointer-events: none;
}

/* Every line going on through the row as one element, a line a level apart, however deep it is:
   an element per level was most of the page in a big tree unfolded a hundred levels deep */
.guide.through {
	top: 0;
	bottom: -1px;
	left: 14px;
	border-left: none;
	background: repeating-linear-gradient(
		to right,
		var(--theme--border-color-subdued) 0 var(--theme--border-width),
		transparent 0 28px
	);
}

/* From just under the open chevron */
.guide.stub {
	top: calc(50% + 13px);
	bottom: -1px;
}

/* At the foot of the table, round the bottom of the last row onto the table's own bottom border,
   which sits below the row, closing the item's contents off */
.guide.end {
	top: 0;
	bottom: calc(-1 * var(--theme--border-width));
	width: 12px;
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
	border-bottom-left-radius: 6px;
}

/* With a row below, stop where that row's corner takes over */
.guide.end.continues {
	bottom: 6px;
	width: 0;
	border-bottom: none;
	border-radius: 0;
}

/* Drawn by the row whose top border is the divider it curves onto, reaching up into the row above */
.guide.corner {
	top: -6px;
	width: 12px;
	height: calc(6px + var(--theme--border-width));
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
	border-bottom-left-radius: 6px;
}

/* A leaf's first mark sits at its own level, as a chevron does, or its drag handle lines up with
   the chevrons a level deeper and it looks like it's inside the folder above. Upright, like a tree's
   guide line: a dash would read as collapse. A little over half the row, so a run of them nearly
   meets but plainly doesn't: joined, they'd claim to be guide lines, broken wherever a sibling
   folder has a chevron. */
.leaf-mark {
	width: 2px;
	height: var(--tree-table-leaf-mark-height);
	background: var(--theme--foreground-subdued);
	border-radius: 1px;
	opacity: 0.5;
}

    .table-row {
	height: var(--tree-table-row-height);


	.cell {
		display: flex;
		align-items: center;
		padding: 8px 12px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		background-color: var(--v-table-background-color, transparent);
		border-top: var(--theme--border-width) solid var(--theme--border-color-subdued);

		&:last-child {
			padding: 0 12px;
		}

		&.controls {
			/* For the tree guides, which reach a pixel past the row onto the divider below */
			position: relative;
			overflow: visible;
			/* Which costs a grid item its zero minimum height: without this, controls a little taller
			   than the row grew its track, pushing the whole row's content down */
			min-height: 0;
			padding: 0;
			display: flex;
			border-top: 0;

			.cell-style {
				display: flex;
				align-items: center;
				flex-grow: 1;
				height: 100%;
				padding: 8px 0;
				border-top: var(--theme--border-width) solid var(--theme--border-color-subdued);

				/* Starting where the guide above curves into it: its column's middle (14px) plus the
				   curve's reach (12px) */
				&.divider-inset {
					border-top-color: transparent;
					background-image: linear-gradient(var(--theme--border-color-subdued), var(--theme--border-color-subdued));
					background-repeat: no-repeat;
					background-position: 26px 0;
					background-size: calc(100% - 26px) var(--theme--border-width);
					background-origin: border-box;
				}
			}
		}
	}

	&.subdued .cell {
		opacity: 0.3;
	}

	&.clickable:not(.subdued):not(.sorting):hover .cell {
		background-color: var(--theme--background-subdued);
		cursor: pointer;

		&.controls {
			background-color: transparent;

			.cell-style {
				background-color: var(--theme--background-subdued);
			}
		}
	}

	.drag-handle {
		--v-icon-color: var(--theme--foreground-subdued);

		&.sorted-manually {
			--v-icon-color: var(--theme--foreground);
			cursor: ns-resize;

			&.nestable {
				cursor: move;
			}

			&:hover {
				--v-icon-color: var(--theme--primary);
			}
		}
	}

	&.sorting:not(.subdued) .drag-handle {
		--v-icon-color: var(--theme--primary);
	}

	/* Held, it stays on top of the rows sliding out of its way */
	&.sorting {
		position: relative;
		z-index: 1;
	}

	&.collapsed {
		visibility: hidden;
		height: 0;
		overflow: hidden;
		pointer-events: none;
	}

	/* Full strength open or folded, and a size up from the other controls' icons (20px here), as
	   it's the one that shows the hierarchy */
	.collapse-btn {
		--v-icon-color: var(--theme--foreground-accent);
		--v-icon-size: 24px;

		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: none;
		border: none;
		border-radius: var(--theme--border-radius);
		cursor: pointer;
		transition: transform 150ms cubic-bezier(0.2, 0, 0, 1);

		&:hover,
		&.children-collapsed:hover {
			--v-icon-color: var(--theme--primary);
		}

		&.children-collapsed {
			transform: rotate(90deg);
		}

		/* Also the row's drag handle: the handle's cursor, not its colours */
		&.movable {
			cursor: move;
		}

		/* Will change with a ⌘ or ⌥ click on the hovered chevron */
		&.fold-target,
		&.fold-target:hover {
			--v-icon-color: var(--theme--primary);

			background: var(--theme--primary-background);
		}
	}

	.append {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	:deep(.render-template) {
		height: var(--tree-table-row-height);

		img {
			height: var(--tree-table-image-height);
		}
	}
}
</style>

<style>
/* Directus's tooltip, outside the table so not scoped: the chevron's hint puts each modifier on its
   own line, and pre-line shows that however the directive inserts the text. Other tooltips have no
   line breaks, so they're unchanged. */
#tooltip {
	white-space: pre-line;
}
</style>
