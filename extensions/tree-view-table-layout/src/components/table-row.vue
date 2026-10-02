<script setup lang="ts">
import type { ShowSelect } from '@directus/extensions';
import type { Ref } from 'vue';
// CORE CHANGES
// import type { Header, Item } from "./types";
import type { Header, Item } from '../core-clones/components/v-table/types';
import { computed, inject } from 'vue';

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
		/** This row's share of the tree's guide lines, by the level of the ancestor each belongs to */
		guides?: { level: number; kind: 'through' | 'end' | 'stub' }[];
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
		height?: number;
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
		height: 48,
	},
);

const emit = defineEmits(['click', 'item-selected', 'toggle-children', 'chevron-hover']);

const cssHeight = computed(() => {
	return {
		tableRow: `${props.height + 2}px`,
		renderTemplateImage: `${props.height - 16}px`,
		leafMark: `${Math.round((props.height + 2) * 0.55)}px`,
	};
});

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

function usePreventClickAfterDragging({ mouseDownHandler, clickHandler }) {
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
		class="table-row"
		:class="{
			subdued,
			clickable: hasClickListener,
			sorting,
			collapsed,
		}"
		@click="onClick"
	>
		<td
			class="cell controls"
			:style="indent > 0 ? { paddingLeft: `${indent}px` } : null"
		>
			<template v-if="!sorting">
				<span
					v-for="guide in guides"
					:key="`${guide.level}-${guide.kind}`"
					class="guide"
					:class="[guide.kind, { continues: guide.kind === 'end' && guidesContinue }]"
					:style="{ left: `${guide.level * 28 + 14}px` }"
				/>
				<span
					v-for="level in guideCorners"
					:key="`corner-${level}`"
					class="guide corner"
					:style="{ left: `${level * 28 + 14}px` }"
				/>
			</template>
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
			:class="`align-${header.align}`"
		>
			<slot
				:name="`item.${header.value}`"
				:item="item"
			>
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
			</slot>
		</td>

		<td class="spacer cell" />
		<td
			v-if="$slots['item-append']"
			class="append cell"
			@click.stop
		>
			<slot name="item-append" />
		</td>
	</tr>
</template>

<style lang="scss" scoped>
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

.guide.through {
	top: 0;
	bottom: -1px;
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
	height: v-bind('cssHeight.leafMark');
	background: var(--theme--foreground-subdued);
	border-radius: 1px;
	opacity: 0.5;
}

    .table-row {
	height: v-bind('cssHeight.tableRow');

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
		height: v-bind('cssHeight.tableRow');

		img {
			height: v-bind('cssHeight.renderTemplateImage');
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
