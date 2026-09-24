<script setup lang="ts">
import type { FieldValue, Graph } from '@polyhierarchies/core';
import { computed, onMounted, reactive, ref, toRef, watch } from 'vue';
import { animates, densityStyles, type Density, type GraphEditor, type Motion } from '../../editing';
import { useHomesOfFocus } from '../../keyHeld';
import { useTree, type Repeat, type TreeRow } from '../../tree';
import { useTreeDrop } from '../../treeDrop';
import NodeLabel from '../NodeLabel.vue';
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
	{ density: 'cosy', motion: 'auto', indent: 28, repeat: 'once' }
);
const focus = defineModel<string | null>('focus', { default: null });
/** How many columns, from the first, move with the hierarchy (see `template`) */
const shiftedColumns = defineModel<number>('shiftedColumns', { default: 1 });

const graph = toRef(props, 'graph');
const tree = useTree(graph, focus, toRef(props, 'repeat'));
const homes = useHomesOfFocus(graph, focus);
const drop = useTreeDrop(graph, toRef(props, 'editor'), tree.open);

/** Column keys in the order dragged into; empty until one is, and unknown keys go last */
const order = ref<string[]>([]);
const columns = computed(() => {
	const all = [
		{ key: 'label', label: 'Name', type: 'label' as const },
		...(props.graph.data.columns ?? []),
		{ key: 'parents', label: 'Parents', type: 'parents' as const }
	];
	const rank = (key: string) => {
		const index = order.value.indexOf(key);
		return index < 0 ? order.value.length : index;
	};
	return all.sort((a, b) => rank(a.key) - rank(b.key));
});

const widths = reactive<Record<string, number>>({});
const width = (key: string) => widths[key] ?? fitted.value[key] ?? 140;
const minWidth = 48;

/** Handle (when editable), checkbox and chevron */
const controlsWidth = computed(() => (props.editor ? 28 : 0) + 28 + 28);
const shifted = computed(() => Math.min(Math.max(0, shiftedColumns.value), columns.value.length));

/** The table's own font, read once it's on the page; until then text is guessed from its length */
const root = ref<HTMLElement>();
const font = ref<{ size: number; family: string } | null>(null);
onMounted(() => {
	const read = () => {
		const style = getComputedStyle(root.value!);
		font.value = { size: parseFloat(style.fontSize), family: style.fontFamily };
	};
	read();
	// Measured before a web font arrives, text is sized in the fallback font
	void document.fonts?.ready.then(() => root.value && read());
});
let context: CanvasRenderingContext2D | null = null;
function textWidth(text: string, weight = 400) {
	if (!font.value) return text.length * 7.5;
	context ??= document.createElement('canvas').getContext('2d')!;
	context.font = `${weight} ${font.value.size}px ${font.value.family}`;
	return context.measureText(text).width;
}

/**
 * Each column wide enough for its longest value, within reason, until it's resized by hand. Like
 * the widths Directus stores, it's for the content alone: the room for the indent is added when
 * drawing (see `template`), so changing the indent or the shifted count never resizes a column.
 */
const fitted = computed(() => {
	const em = font.value?.size ?? 14;
	const out: Record<string, number> = {};
	columns.value.forEach((column) => {
		const most = column.type === 'label' ? 520 : 320;
		const content = props.graph.data.nodes.map((node) => {
			let px: number;
			if (column.type === 'label') {
				const parents = props.graph.parents(node.id);
				// Duplicates and loops only exist of nodes reached more than one way
				const repeated = parents.length > 1 || (parents.length > 0 && !props.graph.spanningParent(node.id));
				px =
					textWidth(node.label) +
					(node.icon || node.colour ? 1.15 * em + 6 : 0) +
					(repeated ? 0.9 * em + 6 : 0) +
					(parents.length > 1 ? 0.75 * em * 2 + 14 : 0);
			} else if (column.type === 'parents')
				px = textWidth(props.graph.parents(node.id).map(props.graph.label).join(', '));
			else px = textWidth(format(node.fields?.[column.key], column.type));
			return Math.min(most, px);
		});
		const natural = Math.max(textWidth(column.label, 600), ...content) + 24 + 8;
		out[column.key] = Math.ceil(Math.max(minWidth, natural));
	});
	return out;
});
/** Once everything is unfolded, as Directus reserves for every loaded item, not just those shown */
const deepest = computed(() =>
	Math.max(0, ...props.graph.data.nodes.map((node) => tree.deepest(node.id)))
);

/**
 * The row's column widths. The controls track grows by the row's indent, pushing the first
 * `shiftedColumns` columns right with it; the last of those shrinks by the same amount, so every
 * column after it starts on one line whatever the depth. It's drawn wider by the deepest indent to
 * give that up from, so every row keeps at least its width, as the Directus layout does. With none
 * shifted, only the controls indent, inside a track wide enough for the deepest row — Directus's
 * own tree view.
 */
function template(depth: number) {
	const indent = depth * props.indent;
	const lead = shifted.value
		? controlsWidth.value + indent
		: controlsWidth.value + deepest.value * props.indent;
	const tracks = columns.value.map((column, index) =>
		index === shifted.value - 1
			? width(column.key) + deepest.value * props.indent - indent
			: width(column.key)
	);
	return [lead, ...tracks].map((px) => `${px}px`).join(' ');
}

function resize(event: PointerEvent, key: string) {
	const handle = event.currentTarget as HTMLElement;
	handle.setPointerCapture(event.pointerId);
	const startX = event.clientX;
	const startWidth = width(key);
	const move = (moved: PointerEvent) =>
		(widths[key] = Math.max(minWidth, startWidth + moved.clientX - startX));
	handle.addEventListener('pointermove', move);
	handle.addEventListener('pointerup', () => handle.removeEventListener('pointermove', move), {
		once: true
	});
}

const moving = ref<string | null>(null);

/**
 * Dragging a heading moves its column to a place where it would sit under the pointer, the nearest
 * if several would, and stays put while it already does. Swapping as soon as the pointer crossed a
 * neighbour would flip a narrow column back and forth across a wide one.
 */
function reorder(event: PointerEvent, key: string) {
	const heading = event.currentTarget as HTMLElement;
	const header = heading.parentElement!;
	heading.setPointerCapture(event.pointerId);
	const startX = event.clientX;
	const move = (moved: PointerEvent) => {
		if (!moving.value && Math.abs(moved.clientX - startX) < 4) return;
		moving.value = key;
		const cells = [...header.querySelectorAll<HTMLElement>('[role="columnheader"]')];
		const x = moved.clientX - cells[0]!.getBoundingClientRect().left;
		const own = heading.getBoundingClientRect().width;
		const others = cells.filter((cell) => cell.dataset.key !== key);
		const current = cells.indexOf(heading);
		const under: number[] = [];
		let start = 0;
		for (let index = 0; index <= others.length; index++) {
			if (x >= start && x <= start + own) under.push(index);
			start += others[index]?.getBoundingClientRect().width ?? 0;
		}
		if (!under.length || under.includes(current)) return;
		const index = under.reduce((a, b) => (Math.abs(b - current) < Math.abs(a - current) ? b : a));
		const keys = others.map((cell) => cell.dataset.key!);
		keys.splice(index, 0, key);
		order.value = keys;
	};
	heading.addEventListener('pointermove', move);
	heading.addEventListener(
		'pointerup',
		() => {
			heading.removeEventListener('pointermove', move);
			moving.value = null;
		},
		{ once: true }
	);
}

const selected = reactive(new Set<string>());
const allSelected = computed(
	() => tree.rows.value.length > 0 && tree.rows.value.every((row) => selected.has(row.id))
);
function toggleAll() {
	if (allSelected.value) selected.clear();
	else for (const row of tree.rows.value) selected.add(row.id);
}
const toggleSelected = (id: string) => (selected.has(id) ? selected.delete(id) : selected.add(id));

function format(value: FieldValue | undefined, type: string) {
	if (value === null || value === undefined || value === '') return '';
	if (type === 'boolean') return value ? '✓' : '–';
	if (type === 'number' && typeof value === 'number') return value.toLocaleString('en-GB');
	return String(value);
}

const fieldOf = (row: TreeRow, key: string) => props.graph.node(row.id).fields?.[key];

/** Clicking a row opens it, as Directus opens the item page; the handle is for moving it */
function select(row: TreeRow) {
	focus.value = row.id;
	props.editor?.open(row.id);
}

/** Under the focus, or at the top level with none */
function addNode() {
	const id = props.editor!.add(focus.value);
	focus.value = id;
	props.editor!.open(id);
}

/** Moving rows animates while there are few enough of them to measure every frame */
const animated = computed(() => animates(props.motion, tree.rows.value.length, 300));

/**
 * Changing how many columns follow the hierarchy slides the columns to their new widths. That lays
 * out every row each frame, so it's only for that moment (a resize drag stays instant) and only
 * while `animated` allows.
 */
const reshaping = ref(false);
let reshaped: ReturnType<typeof setTimeout> | undefined;
watch(shifted, () => {
	reshaping.value = true;
	clearTimeout(reshaped);
	reshaped = setTimeout(() => (reshaping.value = false), 200);
});
</script>

<template>
	<div ref="root" class="tree-table tree-motion" :class="{ still: !animated, reshaping }" :style="densityStyles[density]">
		<TreeToolbar :tree="tree" :focus="focus">
			<span class="stepper" title="Columns that follow the hierarchy">
				<span class="count">{{ shifted }} {{ shifted === 1 ? 'column' : 'columns' }} indent</span>
				<button
					type="button"
					aria-label="One fewer column follows the hierarchy"
					:disabled="shifted === 0"
					@click="shiftedColumns = shifted - 1"
				>
					−
				</button>
				<button
					type="button"
					aria-label="One more column follows the hierarchy"
					:disabled="shifted === columns.length"
					@click="shiftedColumns = shifted + 1"
				>
					+
				</button>
			</span>
			<button v-if="editor" type="button" class="new" @click="addNode">
				+ New{{ focus ? ` under ${graph.data.nodes.find((node) => node.id === focus)?.label ?? ''}` : '' }}
			</button>
			<span v-if="selected.size" class="selection">
				{{ selected.size }} selected
				<button type="button" @click="selected.clear()">Clear</button>
			</span>
		</TreeToolbar>

		<div class="table" role="treegrid">
			<div class="row header" role="row" :style="{ gridTemplateColumns: template(0) }">
				<div class="cell controls">
					<span class="icon-button" />
					<span v-if="editor" class="handle-space" />
					<input
						type="checkbox"
						aria-label="Select every row"
						:checked="allSelected"
						@change="toggleAll"
					/>
				</div>
				<div
					v-for="column in columns"
					:key="column.key"
					class="cell"
					:class="{ moving: moving === column.key }"
					role="columnheader"
					:data-key="column.key"
					title="Drag to reorder"
					@pointerdown.prevent="reorder($event, column.key)"
				>
					<span class="heading">{{ column.label }}</span>
					<span
						class="resizer"
						title="Drag to resize"
						@pointerdown.stop.prevent="resize($event, column.key)"
					/>
				</div>
			</div>

			<TransitionGroup :name="animated ? 'tree-fold' : ''" tag="div" class="rows">
			<div
				v-for="row in tree.rows.value"
				:key="row.key"
				class="row"
				role="row"
				:aria-level="row.depth + 1"
				:aria-expanded="row.hasChildren ? row.open : undefined"
				:class="[
					{
						current: row.full && focus === row.id,
						selected: selected.has(row.id),
						duplicate: !row.full,
						loop: row.loop,
						dragging: drop.dragging.value?.key === row.key,
						landed: drop.landed.value === row.id,
						home: homes.has(row.id)
					},
					drop.zoneOf(row) && `drop-${drop.zoneOf(row)}`
				]"
				:style="{ gridTemplateColumns: template(row.depth) }"
				@click="select(row)"
				@dragover="drop.over($event, row)"
				@drop="drop.drop($event, row)"
			>
				<div class="cell controls" :style="{ paddingLeft: `${row.depth * indent}px` }">
					<!-- First, so a leaf's empty slot reads as indentation rather than a gap before its name -->
					<button
						v-if="row.hasChildren"
						type="button"
						class="icon-button toggle"
						:class="{ open: row.open }"
						:aria-label="row.open ? 'Collapse' : 'Expand'"
						@click.stop="tree.toggle(row)"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
					</button>
					<span v-else class="icon-button" />
					<button
						v-if="editor"
						type="button"
						class="icon-button handle"
						draggable="true"
						title="Drag to move; hold Alt to add a parent instead"
						@click.stop
						@dragstart="drop.start($event, row)"
						@dragend="drop.end"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M5 15h14" /></svg>
					</button>
					<input
						type="checkbox"
						:aria-label="`Select ${graph.label(row.id)}`"
						:checked="selected.has(row.id)"
						@click.stop
						@change="toggleSelected(row.id)"
					/>
				</div>

				<div
					v-for="column in columns"
					:key="column.key"
					class="cell"
					:class="{ label: column.type === 'label', moving: moving === column.key }"
					role="gridcell"
				>
					<template v-if="column.type === 'label'">
						<NodeLabel
							:graph="graph"
							:id="row.id"
							:duplicate="!row.full"
							:loop="row.loop"
							:mirror="row.mirror"
						/>
					</template>
					<span v-else-if="column.type === 'parents'" class="text">
						{{ graph.parents(row.id).map(graph.label).join(', ') }}
					</span>
					<span v-else class="text" :class="column.type">
						{{ format(fieldOf(row, column.key), column.type) }}
					</span>
				</div>
			</div>
			</TransitionGroup>
		</div>
	</div>
</template>

<style scoped>
.table {
	width: max-content;
	min-width: 100%;
}

.row {
	position: relative;
	display: grid;
	/* A fixed height, so folding can slide it to nothing and back */
	height: var(--row-height);
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
	cursor: pointer;
}

.row:not(.header):hover {
	background: var(--theme--background-subdued);
}

.row.current,
.row.selected {
	background: var(--theme--primary-background);
}

/* Holding Alt: everything the focus lives in, lit wherever it appears */
.row.home {
	background: color-mix(in srgb, var(--theme--secondary) 20%, transparent);
}

.row.duplicate {
	color: var(--theme--foreground-subdued);
}

.row.loop .cell.label {
	color: var(--theme--warning);
}

.reshaping .row {
	transition:
		opacity 150ms ease-out,
		grid-template-columns 160ms var(--ease-out);
}

.header {
	position: sticky;
	top: 0;
	z-index: 1;
	font-weight: 600;
	color: var(--theme--foreground-accent);
	background: var(--theme--background);
	border-bottom-color: var(--theme--border-color);
	cursor: default;
}

.header [role='columnheader'] {
	cursor: grab;
	touch-action: none;
}

.header [role='columnheader'].moving {
	cursor: grabbing;
}

/* The whole column lit while its heading is dragged, so you can see what's moving */
.cell.moving {
	background: color-mix(in srgb, var(--theme--primary) 10%, transparent);
}

.cell {
	position: relative;
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	padding: 0 12px;
}

.cell.controls {
	gap: 4px;
	padding-right: 0;
}

.text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* Left like every other column, as Directus aligns them, but with figures of equal width */
.text.number {
	font-variant-numeric: tabular-nums;
}

.heading {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* A wide hit area on the column's right edge, drawn as a hairline */
.resizer {
	position: absolute;
	top: 20%;
	right: -4px;
	bottom: 20%;
	z-index: 1;
	width: 8px;
	cursor: col-resize;
}

.resizer::after {
	content: '';
	position: absolute;
	left: 3px;
	top: 0;
	bottom: 0;
	width: 2px;
	border-radius: 1px;
	background: var(--theme--border-color);
}

.resizer:hover::after {
	background: var(--theme--primary);
}

.handle-space {
	flex-shrink: 0;
	width: 24px;
}

input[type='checkbox'] {
	flex-shrink: 0;
	width: 16px;
	height: 16px;
	margin: 0 4px;
	accent-color: var(--theme--primary);
}

.icon-button {
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

.icon-button:hover {
	color: var(--theme--foreground);
}

.handle {
	cursor: grab;
}

.icon-button svg {
	width: 100%;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
}

.toggle svg {
	transition: transform 150ms var(--ease-out);
}

.toggle.open svg {
	transform: rotate(90deg);
}

.row.drop-inside {
	outline: 2px solid var(--theme--primary);
	outline-offset: -2px;
}

.rows {
	position: relative;
}

/*
 * Folding slides rows shut and open, as the Directus layout does: the same timing, and rows keep
 * their place while they shrink, so the ones below follow them rather than jumping. Unlike the
 * Outline's rows, which leave the flow and fade.
 */
.tree-fold-enter-active,
.tree-fold-leave-active {
	overflow: hidden;
	transition:
		height 150ms var(--ease-out),
		opacity 150ms ease-out;
}

.tree-fold-enter-from,
.tree-fold-leave-to {
	height: 0;
	opacity: 0;
}

.tree-fold-move {
	transition: transform 160ms var(--ease-out);
}

.stepper {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	margin: 0 8px 0 12px;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}

.stepper button {
	min-width: 26px;
	padding: 4px 6px;
	font: inherit;
	color: inherit;
	background: none;
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.stepper button:hover:not(:disabled) {
	color: var(--theme--foreground);
	border-color: var(--theme--border-color-accent);
}

.stepper button:disabled {
	cursor: default;
	opacity: 0.5;
}

.stepper .count {
	margin-right: 2px;
	font-variant-numeric: tabular-nums;
}

.new {
	padding: 4px 10px;
	font: inherit;
	font-size: 13px;
	color: var(--theme--foreground);
	background: var(--theme--primary-background);
	border: var(--theme--border-width) solid var(--theme--primary);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.selection {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	margin-left: 8px;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}

.selection button {
	padding: 2px 8px;
	font: inherit;
	color: inherit;
	background: none;
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}
</style>
