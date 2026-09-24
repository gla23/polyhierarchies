<script setup lang="ts">
import { levelsWithin, type Graph } from '@polyhierarchies/core';
import { computed, nextTick, ref, watch } from 'vue';
import { animates, densityStyles, type Density, type GraphEditor, type Motion } from '../../editing';
import NodeButton from '../NodeButton.vue';
import { layeredLayout } from './layout';

const props = withDefaults(
	defineProps<{
		graph: Graph;
		editor?: GraphEditor;
		density?: Density;
		motion?: Motion;
		/** The whole graph, the focus's neighbourhood, or its ancestors alone; auto picks by size */
		scope?: 'auto' | 'all' | 'focus' | 'ancestors';
	}>(),
	{ density: 'cosy', motion: 'auto', scope: 'auto' }
);
const focus = defineModel<string | null>('focus', { default: null });

const spacing = computed(
	() =>
		({
			compact: { layerGap: 36, nodeGap: 12, nodeHeight: 28 },
			cosy: { layerGap: 56, nodeGap: 16, nodeHeight: 32 },
			comfortable: { layerGap: 76, nodeGap: 20, nodeHeight: 40 }
		})[props.density]
);

const active = computed(() =>
	focus.value && props.graph.data.nodes.some((node) => node.id === focus.value)
		? focus.value
		: (props.graph.data.start ?? props.graph.roots[0]!)
);

const wholeGraph = computed(
	() => props.scope === 'all' || (props.scope === 'auto' && props.graph.data.nodes.length <= 150)
);

/** Levels up and down while they fit, as the plex does: with cycles, "everything above and below"
 *  can be the whole graph */
const reach = 60;
const ids = computed(() => {
	if (wholeGraph.value) return props.graph.data.nodes.map((node) => node.id);
	const { graph } = props;
	// QuickGO's ancestor chart: every path up to the roots at once, and nothing below
	if (props.scope === 'ancestors')
		return [...levelsWithin(graph.ancestors(active.value), 200).flat().reverse(), active.value];
	return [
		...new Set([
			...levelsWithin(graph.ancestors(active.value), reach).flat().reverse(),
			active.value,
			...levelsWithin(graph.descendants(active.value), reach).flat()
		])
	];
});

/**
 * Positions come before anything renders, so labels are measured in the font they'll be drawn in —
 * guessing from the character count clipped short names. Once web fonts load, it lays out again.
 */
const root = ref<HTMLElement>();
const fontsLoaded = ref(0);
document.fonts?.ready.then(() => fontsLoaded.value++);
const measurer = document.createElement('canvas').getContext('2d')!;
const widthOf = computed(() => {
	void fontsLoaded.value;
	const style = root.value ? getComputedStyle(root.value) : null;
	measurer.font = `${style?.fontWeight ?? 500} ${style?.fontSize ?? '14px'} ${style?.fontFamily ?? 'system-ui'}`;
	return (id: string) => {
		const node = props.graph.node(id);
		const icon = node.icon || node.colour ? 22 : 0;
		const badge = props.graph.parents(id).length > 1 ? 30 : 0;
		// The button's padding and border, the gaps between its parts, and a little air
		return Math.min(320, Math.ceil(measurer.measureText(node.label).width) + 30 + icon + badge);
	};
});

const layout = computed(() => layeredLayout(props.graph, ids.value, widthOf.value, spacing.value));
const placed = computed(() => new Map(layout.value.nodes.map((node) => [node.id, node])));

const padding = 24;
const near = computed(() => {
	const id = active.value;
	return new Set([...props.graph.parents(id), ...props.graph.children(id), ...props.graph.jumps(id)]);
});

function edgePath(from: string, to: string, kind: string) {
	const a = placed.value.get(from)!;
	const b = placed.value.get(to)!;
	const { nodeHeight } = spacing.value;
	if (kind === 'jump') {
		const [ax, ay, bx, by] = [a.x, a.y + nodeHeight / 2, b.x, b.y + nodeHeight / 2];
		return `M${ax},${ay} Q${(ax + bx) / 2},${Math.min(ay, by) - 30} ${bx},${by}`;
	}
	if (kind === 'cycle') {
		// Back up the layers: out round the right-hand side, so it can't be mistaken for a way down
		const ax = a.x + a.width / 2;
		const bx = b.x + b.width / 2;
		const out = Math.max(ax, bx) + 60;
		return `M${ax},${a.y + nodeHeight / 2} C${out},${a.y + nodeHeight / 2} ${out},${b.y + nodeHeight / 2} ${bx + 4},${b.y + nodeHeight / 2}`;
	}
	const [ax, ay, bx, by] = [a.x, a.y + nodeHeight, b.x, b.y - 4];
	const mid = (ay + by) / 2;
	return `M${ax},${ay} C${ax},${mid} ${bx},${mid} ${bx},${by}`;
}

const animated = computed(() => animates(props.motion, ids.value.length, 150));

/** Refocusing re-lays the graph out around the new focus; each node glides to its new place */
function pick(id: string) {
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced || !animated.value || wholeGraph.value || !document.startViewTransition)
		return void (focus.value = id);
	document.startViewTransition(async () => {
		focus.value = id;
		await nextTick();
	});
}

const transitionName = (id: string) =>
	animated.value ? { viewTransitionName: `layered-${CSS.escape(id)}`, viewTransitionClass: 'layered-node' } : {};

function addNode() {
	const id = props.editor!.add(focus.value);
	focus.value = id;
	props.editor!.open(id);
}

watch(
	active,
	async (id) => {
		await nextTick();
		root.value
			?.querySelector(`[data-id="${CSS.escape(id)}"]`)
			?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: animated.value ? 'smooth' : 'auto' });
	},
	{ immediate: true }
);

const markerPrefix = `layered-${Math.random().toString(36).slice(2)}`;
</script>

<template>
	<div ref="root" class="layered-dag" :style="densityStyles[density]">
		<div v-if="editor" class="toolbar">
			<button type="button" @click="addNode">
				+ New{{ focus ? ` under ${graph.label(active)}` : '' }}
			</button>
		</div>
		<p v-if="!wholeGraph" class="scope">
			Showing {{ ids.length }} of {{ graph.data.nodes.length }}:
			{{
				scope === 'ancestors'
					? 'the focus and every path up from it.'
					: 'the focus, and the levels above and below it that fit.'
			}}
		</p>

		<div
			class="canvas"
			:style="{
				width: `${layout.width + padding * 2 + 80}px`,
				height: `${layout.height + padding * 2}px`
			}"
		>
			<svg class="edges" aria-hidden="true">
				<defs>
					<marker
						v-for="kind in ['hierarchy', 'lit', 'cycle']"
						:id="`${markerPrefix}-${kind}`"
						:key="kind"
						:class="`marker ${kind}`"
						viewBox="0 0 10 10"
						refX="10"
						refY="5"
						markerWidth="5"
						markerHeight="5"
						orient="auto"
					>
						<path d="M0,0L10,5L0,10z" />
					</marker>
				</defs>
				<g :transform="`translate(${padding}, ${padding})`">
					<path
						v-for="edge in layout.edges"
						:key="`${edge.kind}:${edge.from}>${edge.to}`"
						:d="edgePath(edge.from, edge.to, edge.kind)"
						:class="[edge.kind, { lit: edge.from === active || edge.to === active }]"
						:marker-end="
							edge.kind === 'jump'
								? undefined
								: `url(#${markerPrefix}-${edge.kind === 'cycle' ? 'cycle' : edge.from === active || edge.to === active ? 'lit' : 'hierarchy'})`
						"
					/>
				</g>
			</svg>

			<div
				v-for="node in layout.nodes"
				:key="node.id"
				class="place"
				:data-id="node.id"
				:style="{
					transform: `translate(${node.x - node.width / 2 + padding}px, ${node.y + padding}px)`,
					width: `${node.width}px`,
					height: `${spacing.nodeHeight}px`
				}"
			>
				<NodeButton
					:graph="graph"
					:id="node.id"
					:current="node.id === active"
					:echo="near.has(node.id)"
					:style="transitionName(node.id)"
					@click="pick(node.id)"
					@dblclick="editor?.open(node.id)"
				/>
			</div>
		</div>
	</div>
</template>

<style>
::view-transition-group(*.layered-node) {
	animation-duration: 380ms;
	animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
</style>

<style scoped>
.toolbar {
	margin-bottom: 12px;
}

.toolbar button {
	padding: 4px 10px;
	font: inherit;
	font-size: 13px;
	color: var(--theme--foreground);
	background: var(--theme--primary-background);
	border: var(--theme--border-width) solid var(--theme--primary);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.scope {
	margin: 0 0 8px;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.canvas {
	position: relative;
}

.edges {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	overflow: visible;
	pointer-events: none;
}

.edges path {
	fill: none;
	stroke: var(--theme--border-color-accent);
	stroke-width: 1.5;
}

.edges path.jump {
	stroke: var(--theme--foreground-subdued);
	stroke-dasharray: 4 4;
	opacity: 0.6;
}

.edges path.cycle {
	stroke: var(--theme--warning);
	stroke-width: 2;
}

.edges path.lit:not(.cycle) {
	stroke: var(--theme--primary);
}

.marker path {
	fill: var(--theme--border-color-accent);
}

.marker.lit path {
	fill: var(--theme--primary);
}

.marker.cycle path {
	fill: var(--theme--warning);
}

.place {
	position: absolute;
	top: 0;
	left: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.place :deep(.node-button) {
	width: 100%;
	justify-content: center;
	--node-padding-y: 0;
	height: 100%;
}
</style>
