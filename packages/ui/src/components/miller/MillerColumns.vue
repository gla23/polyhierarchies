<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import { computed, nextTick, ref, toRef, watch } from 'vue';
import { animates, densityStyles, type Density, type GraphEditor, type Motion } from '../../editing';
import { useHomesOfFocus } from '../../keyHeld';
import NodeLabel from '../NodeLabel.vue';

const props = withDefaults(
	defineProps<{ graph: Graph; editor?: GraphEditor; density?: Density; motion?: Motion }>(),
	{ density: 'cosy', motion: 'auto' }
);
const focus = defineModel<string | null>('focus', { default: null });

/** The route the columns show, one selected node per column */
const trail = ref<string[]>([]);
const homes = useHomesOfFocus(toRef(props, 'graph'), focus);

/** Down to where a full render would draw `id`: the first route there, before any other is picked */
function routeTo(id: string) {
	const path = [id];
	for (let parent = props.graph.spanningParent(id); parent; parent = props.graph.spanningParent(parent))
		path.unshift(parent);
	return path;
}

// Following a focus set elsewhere, unless it's already the end of the route being shown
watch(
	focus,
	(id) => {
		if (id && props.graph.data.nodes.some((node) => node.id === id) && trail.value.at(-1) !== id)
			trail.value = routeTo(id);
	},
	{ immediate: true }
);

const columns = computed(() => {
	const out = [{ parent: null as string | null, ids: props.graph.roots }];
	for (const id of trail.value) {
		const children = props.graph.data.nodes.some((node) => node.id === id)
			? props.graph.children(id)
			: [];
		if (!children.length) break;
		out.push({ parent: id, ids: children });
	}
	return out;
});

const selected = computed(() => trail.value.at(-1) ?? null);

function choose(column: number, id: string) {
	trail.value = [...trail.value.slice(0, column), id];
	focus.value = id;
}

/** Another of its parents: the columns re-route through that one */
function viaParent(parent: string) {
	const id = selected.value!;
	trail.value = [...routeTo(parent), id];
	focus.value = id;
}

function addIn(parent: string | null) {
	const id = props.editor!.add(parent);
	props.editor!.open(id);
}

const animated = computed(() => animates(props.motion, columns.value.length * 20, 400));

const root = ref<HTMLElement>();
watch(
	() => trail.value.join('/'),
	async () => {
		await nextTick();
		const scroller = root.value;
		scroller?.scrollTo({ left: scroller.scrollWidth, behavior: animated.value ? 'smooth' : 'auto' });
	}
);
</script>

<template>
	<div ref="root" class="miller" :style="densityStyles[density]">
		<TransitionGroup :name="animated ? 'miller-column' : ''">
			<section
				v-for="(column, index) in columns"
				:key="`${index}:${column.parent}`"
				class="column"
			>
				<button
					v-for="id in column.ids"
					:key="id"
					type="button"
					class="item"
					:class="{
						selected: trail[index] === id,
						current: trail[index] === id && index === trail.length - 1,
						home: homes.has(id)
					}"
					@click="choose(index, id)"
					@dblclick="editor?.open(id)"
				>
					<NodeLabel :graph="graph" :id="id" :loop="trail.slice(0, index).includes(id)" />
					<svg
						v-if="graph.children(id).length"
						class="chevron"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path d="M9 6l6 6-6 6" />
					</svg>
				</button>
				<button v-if="editor" type="button" class="add" @click="addIn(column.parent)">
					+ Add here
				</button>
			</section>

			<!-- The last column says what's selected, and every place it lives -->
			<section v-if="selected" key="detail" class="column detail">
				<h3><NodeLabel :graph="graph" :id="selected" /></h3>
				<p class="subdued">
					{{ graph.children(selected).length }} children ·
					{{ graph.parents(selected).length || 'no' }}
					{{ graph.parents(selected).length === 1 ? 'parent' : 'parents' }}
				</p>
				<template v-if="graph.parents(selected).length > 1">
					<p class="subdued">Reached here through {{ graph.label(trail.at(-2) ?? selected) }}. Also under:</p>
					<button
						v-for="parent in graph.parents(selected).filter((each) => each !== trail.at(-2))"
						:key="parent"
						type="button"
						class="item"
						@click="viaParent(parent)"
					>
						<NodeLabel :graph="graph" :id="parent" />
					</button>
				</template>
				<button v-if="editor" type="button" class="add" @click="editor.open(selected)">Edit</button>
			</section>
		</TransitionGroup>
	</div>
</template>

<style scoped>
.miller {
	display: flex;
	height: 100%;
	min-height: 420px;
	overflow-x: auto;
	overscroll-behavior-x: contain;
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
}

.column {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	gap: var(--row-gap);
	width: 230px;
	padding: 6px;
	overflow-y: auto;
	overscroll-behavior-y: contain;
	border-right: var(--theme--border-width) solid var(--theme--border-color);
}

.detail {
	width: 260px;
	background: var(--theme--background-subdued);
}

h3 {
	margin: 6px 6px 2px;
	font-size: 15px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.subdued {
	margin: 4px 6px 8px;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 6px;
	width: 100%;
	min-height: calc(var(--row-height) - 12px);
	padding: var(--node-padding-y) 8px;
	font: inherit;
	color: var(--theme--foreground);
	text-align: left;
	background: none;
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.item:hover {
	background: var(--theme--background-normal);
}

.item.selected {
	background: var(--theme--background-accent);
}

.item.current {
	color: var(--theme--foreground-accent);
	background: var(--theme--primary-background);
}

.item.home {
	background: color-mix(in srgb, var(--theme--secondary) 25%, transparent);
}

.chevron {
	flex-shrink: 0;
	width: 16px;
	fill: none;
	stroke: var(--theme--foreground-subdued);
	stroke-width: 2;
}

.add {
	margin-top: 4px;
	padding: 4px 8px;
	font: inherit;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
	text-align: left;
	background: none;
	border: var(--theme--border-width) dashed var(--theme--border-color-accent);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.add:hover {
	color: var(--theme--foreground);
	border-color: var(--theme--primary);
}

/* A new column slides in from the one that opened it */
.miller-column-enter-active {
	transition:
		opacity 180ms ease-out,
		transform 180ms cubic-bezier(0.2, 0, 0, 1);
}

.miller-column-enter-from {
	opacity: 0;
	transform: translateX(-16px);
}

.miller-column-leave-active {
	transition: opacity 100ms ease-in;
}

.miller-column-leave-to {
	opacity: 0;
}
</style>
