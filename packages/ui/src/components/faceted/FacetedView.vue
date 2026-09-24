<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import { computed, reactive, ref, watch } from 'vue';
import { animates, densityStyles, type Density, type GraphEditor, type Motion } from '../../editing';
import NodeLabel from '../NodeLabel.vue';

/**
 * Parents as filters rather than places: tick Fruit and Salad and what's left is everything under
 * both. How people actually use several parents — narrowing down, not browsing — and why a
 * polyhierarchy beats a tree for finding things.
 */
const props = withDefaults(
	defineProps<{
		graph: Graph;
		editor?: GraphEditor;
		density?: Density;
		motion?: Motion;
		/** Whether a facet holds only its children, or everything below it */
		reach?: 'children' | 'descendants';
	}>(),
	{ density: 'cosy', motion: 'auto', reach: 'descendants' }
);
const focus = defineModel<string | null>('focus', { default: null });

const chosen = reactive(new Set<string>());
const search = ref('');
watch(
	() => props.graph.data.id,
	() => chosen.clear()
);

// Each node's facets — its ancestors, or just its parents — worked out once per graph. Filtering is
// then a subset check, and one pass over the results' facets counts every facet at once, rather
// than listing each facet's members (over a thousand searches on the big generated graph).
const facetsOf = computed(() => {
	const { graph, reach } = props;
	const cache = new Map<string, Set<string>>();
	return (id: string) => {
		let found = cache.get(id);
		if (!found) {
			found = new Set(reach === 'children' ? graph.parents(id) : graph.ancestors(id).flat());
			cache.set(id, found);
		}
		return found;
	};
});

/** Under every chosen facet; with none chosen, every node that isn't itself a facet */
const results = computed(() => {
	const of = facetsOf.value;
	const picked = [...chosen].filter((id) => props.graph.data.nodes.some((node) => node.id === id));
	const ids = props.graph.data.nodes.map((node) => node.id);
	if (!picked.length) return ids.filter((id) => !props.graph.children(id).length);
	return ids.filter((id) => picked.every((facet) => of(id).has(facet)));
});

/** How many results each facet would leave if ticked too: the counts faceted search shows */
const facetRows = computed(() => {
	const of = facetsOf.value;
	const counts = new Map<string, number>();
	for (const id of results.value)
		for (const facet of of(id)) counts.set(facet, (counts.get(facet) ?? 0) + 1);
	for (const facet of chosen) counts.set(facet, results.value.length);
	const term = search.value.trim().toLowerCase();
	return [...counts]
		.filter(([id]) => !term || props.graph.label(id).toLowerCase().includes(term))
		.map(([id, count]) => ({ id, count }))
		.sort((a, b) => Number(chosen.has(b.id)) - Number(chosen.has(a.id)) || b.count - a.count);
});

const shownFacets = computed(() => facetRows.value.slice(0, 60));
const shownResults = computed(() => results.value.slice(0, 200));

function toggle(id: string) {
	if (chosen.has(id)) chosen.delete(id);
	else chosen.add(id);
}

/** Born with every chosen facet as a parent: the one place a node starts life in several */
function addInChosen() {
	const editor = props.editor!;
	const [first, ...rest] = [...chosen];
	const id = editor.add(first ?? null);
	for (const facet of rest) editor.link(facet, id);
	editor.open(id);
}

const animated = computed(() => animates(props.motion, shownResults.value.length, 150));
</script>

<template>
	<div class="faceted" :style="densityStyles[density]">
		<aside class="facets">
			<input v-model="search" type="search" placeholder="Filter facets" aria-label="Filter facets" />
			<label v-for="row in shownFacets" :key="row.id" class="facet" :class="{ on: chosen.has(row.id) }">
				<input type="checkbox" :checked="chosen.has(row.id)" @change="toggle(row.id)" />
				<NodeLabel :graph="graph" :id="row.id" />
				<span class="count">{{ row.count }}</span>
			</label>
			<p v-if="facetRows.length > shownFacets.length" class="subdued">
				{{ facetRows.length - shownFacets.length }} more — filter to find them
			</p>
		</aside>

		<section class="results">
			<header>
				<template v-if="chosen.size">
					<span v-for="(id, index) in [...chosen]" :key="id" class="chip">
						<span v-if="index" class="and">∩</span>
						<button type="button" :title="`Remove ${graph.label(id)}`" @click="toggle(id)">
							<NodeLabel :graph="graph" :id="id" /> ×
						</button>
					</span>
				</template>
				<span v-else class="subdued">Tick facets to narrow down. Showing every leaf.</span>
				<span class="total">{{ results.length }} {{ results.length === 1 ? 'result' : 'results' }}</span>
				<button v-if="editor && chosen.size" type="button" class="new" @click="addInChosen">
					+ New in {{ chosen.size === 1 ? 'this facet' : `all ${chosen.size}` }}
				</button>
			</header>

			<TransitionGroup :name="animated ? 'facet-result' : ''" tag="ul" class="list">
				<li
					v-for="id in shownResults"
					:key="id"
					class="result"
					:class="{ current: focus === id }"
					@click="focus = id"
					@dblclick="editor?.open(id)"
				>
					<NodeLabel :graph="graph" :id="id" />
					<span class="parents">
						<span
							v-for="parent in graph.parents(id)"
							:key="parent"
							class="parent"
							:class="{ matched: chosen.has(parent) }"
							>{{ graph.label(parent) }}</span
						>
					</span>
				</li>
			</TransitionGroup>
			<p v-if="results.length > shownResults.length" class="subdued">
				{{ results.length - shownResults.length }} more — tick another facet to narrow it
			</p>
		</section>
	</div>
</template>

<style scoped>
.faceted {
	display: grid;
	grid-template-columns: 260px minmax(0, 1fr);
	gap: 20px;
}

.facets {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

input[type='search'] {
	margin-bottom: 8px;
	padding: 6px 10px;
	font: inherit;
	color: var(--theme--form--field--input--foreground);
	background: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.facet {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: var(--node-padding-y) 6px;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.facet:hover {
	background: var(--theme--background-normal);
}

.facet.on {
	background: var(--theme--primary-background);
}

.facet input {
	accent-color: var(--theme--primary);
}

.count {
	margin-left: auto;
	font-size: 12px;
	font-variant-numeric: tabular-nums;
	color: var(--theme--foreground-subdued);
}

header {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	margin-bottom: 12px;
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.chip button {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 3px 8px;
	font: inherit;
	color: var(--theme--foreground-accent);
	background: var(--theme--primary-background);
	border: var(--theme--border-width) solid var(--theme--primary);
	border-radius: 999px;
	cursor: pointer;
}

.and {
	color: var(--theme--foreground-subdued);
}

.total {
	margin-left: auto;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}

.new {
	padding: 4px 10px;
	font: inherit;
	font-size: 13px;
	color: var(--theme--foreground);
	background: none;
	border: var(--theme--border-width) dashed var(--theme--primary);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.list {
	position: relative;
	margin: 0;
	padding: 0;
	list-style: none;
}

.result {
	display: flex;
	align-items: center;
	gap: 12px;
	min-height: calc(var(--row-height) - 8px);
	padding: 0 10px;
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
	cursor: pointer;
}

.result:hover {
	background: var(--theme--background-subdued);
}

.result.current {
	background: var(--theme--primary-background);
}

.parents {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-left: auto;
}

.parent {
	padding: 1px 7px;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: 999px;
}

.parent.matched {
	color: var(--theme--foreground-accent);
	border-color: var(--theme--primary);
}

.subdued {
	margin: 8px 0 0;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.facet-result-move {
	transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
}

.facet-result-enter-active {
	transition:
		opacity 160ms ease-out,
		transform 160ms ease-out;
}

.facet-result-enter-from {
	opacity: 0;
	transform: translateX(-8px);
}

.facet-result-leave-active {
	position: absolute;
	left: 0;
	right: 0;
	transition: opacity 100ms ease-in;
}

.facet-result-leave-to {
	opacity: 0;
}
</style>
