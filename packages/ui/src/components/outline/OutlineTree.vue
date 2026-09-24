<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import { computed, nextTick, ref, toRef, watch } from 'vue';
import { animates, densityStyles, type Density, type GraphEditor, type Motion } from '../../editing';
import { useHomesOfFocus } from '../../keyHeld';
import { useTree, type Repeat } from '../../tree';
import { useTreeDrop } from '../../treeDrop';
import NodeButton from '../NodeButton.vue';
import RowActions from '../RowActions.vue';
import TreeToolbar from '../TreeToolbar.vue';
import '../../motion.css';

const props = withDefaults(
	defineProps<{
		graph: Graph;
		editor?: GraphEditor;
		density?: Density;
		motion?: Motion;
		indent?: number;
		/** Every other placement as a terminal duplicate, or drawn in full as a mirror */
		repeat?: Repeat;
	}>(),
	{ density: 'cosy', motion: 'auto', indent: 24, repeat: 'once' }
);
const focus = defineModel<string | null>('focus', { default: null });

const graph = toRef(props, 'graph');
const tree = useTree(graph, focus, toRef(props, 'repeat'));
const homes = useHomesOfFocus(graph, focus);
const drop = useTreeDrop(graph, toRef(props, 'editor'), tree.open);
const hovered = ref<string | null>(null);

const list = ref<{ $el: HTMLElement }>();

/** Moving rows animates while there are few enough of them to measure every frame */
const animated = computed(() => animates(props.motion, tree.rows.value.length, 300));
// The full placement scrolls into view when the focus moves to it, from here or another UI
watch(focus, async (id) => {
	await nextTick();
	list.value?.$el.querySelector(`[data-full-id="${CSS.escape(id ?? '')}"]`)?.scrollIntoView({
		block: 'nearest',
		behavior: 'smooth'
	});
});
</script>

<template>
	<div class="outline tree-motion" :class="{ still: !animated }" :style="densityStyles[density]">
		<TreeToolbar :tree="tree" :focus="focus" />
		<TransitionGroup ref="list" :name="animated ? 'tree-row' : ''" tag="ul" class="rows">
			<li
				v-for="row in tree.rows.value"
				:key="row.key"
				class="row"
				:class="[
					drop.zoneOf(row) && `drop-${drop.zoneOf(row)}`,
					{
						dragging: drop.dragging.value?.key === row.key,
						landed: drop.landed.value === row.id,
						home: homes.has(row.id)
					}
				]"
				:style="{ paddingLeft: `${row.depth * indent}px` }"
				:data-full-id="row.full ? row.id : undefined"
				@dragover="drop.over($event, row)"
				@drop="drop.drop($event, row)"
			>
				<button
					v-if="editor"
					type="button"
					class="handle"
					draggable="true"
					title="Drag to move; hold Alt to add a parent instead"
					@dragstart="drop.start($event, row)"
					@dragend="drop.end"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M5 15h14" /></svg>
				</button>
				<button
					v-if="row.hasChildren"
					type="button"
					class="toggle"
					:class="{ open: row.open }"
					:aria-expanded="row.open"
					:aria-label="row.open ? 'Collapse' : 'Expand'"
					@click="tree.toggle(row)"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
				</button>
				<span v-else class="toggle" />
				<NodeButton
					:graph="graph"
					:id="row.id"
					:current="row.full && focus === row.id"
					:echo="hovered === row.id"
					:duplicate="!row.full"
					:loop="row.loop"
					:mirror="row.mirror"
					@click="focus = row.id"
					@dblclick="editor?.open(row.id)"
					@mouseenter="hovered = row.id"
					@mouseleave="hovered = null"
				/>
				<RowActions v-if="editor" :graph="graph" :row="row" :editor="editor" @added="tree.open" />
			</li>
		</TransitionGroup>
	</div>
</template>

<style scoped>
.rows {
	position: relative;
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	position: relative;
	display: flex;
	align-items: center;
	gap: 4px;
	padding-block: var(--row-gap);
}

.row:hover :deep(.row-actions) {
	opacity: 1;
}

/* Holding Alt: everything the focus lives in, lit wherever it appears */
.row.home :deep(.node-button) {
	background: color-mix(in srgb, var(--theme--secondary) 25%, var(--theme--background-normal));
	border-color: var(--theme--secondary);
}

/* The drop line and landing flash are in motion.css; inside rings the new parent */
.row.drop-inside :deep(.node-button) {
	outline: 2px solid var(--theme--primary);
}

.toggle,
.handle {
	display: flex;
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	padding: 0;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	cursor: pointer;
}

.handle {
	cursor: grab;
}

.toggle svg,
.handle svg {
	width: 100%;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
}

.toggle svg {
	transition: transform 0.15s;
}

.toggle.open svg {
	transform: rotate(90deg);
}

.toggle:hover,
.handle:hover {
	color: var(--theme--foreground);
}
</style>
