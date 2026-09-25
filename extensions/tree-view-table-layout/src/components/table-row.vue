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
			<div class="cell-style">
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
						:class="{ 'children-collapsed': childrenCollapsed, 'fold-target': foldTarget }"
						:aria-label="childrenCollapsed ? 'Unfold' : 'Fold'"
						:aria-expanded="!childrenCollapsed"
						@click.stop="$emit('toggle-children', $event)"
						@pointerenter="$emit('chevron-hover', $event)"
						@pointermove="$emit('chevron-hover', $event)"
						@pointerleave="$emit('chevron-hover', null)"
					>
						<v-icon name="expand_more" />
					</button>
				</span>
				<v-icon
					v-if="showManualSort"
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
	justify-content: center;
	width: 28px;
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

	.collapse-btn {
		--v-icon-color: var(--theme--foreground-subdued);

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
			--v-icon-color: var(--theme--foreground);
			transform: rotate(90deg);
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
