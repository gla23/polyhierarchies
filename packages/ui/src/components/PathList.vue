<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import { computed } from 'vue';
import NodeLabel from './NodeLabel.vue';

/** Every route from a root down to `id`, as breadcrumbs: in a tree there's one, here there are several */
const props = withDefaults(defineProps<{ graph: Graph; id: string; limit?: number }>(), {
	limit: 20
});
const emit = defineEmits<{ pick: [id: string] }>();

const found = computed(() =>
	props.graph.data.nodes.some((node) => node.id === props.id)
		? props.graph.paths(props.id, props.limit)
		: { paths: [], truncated: false }
);
</script>

<template>
	<div class="path-list">
		<ol v-for="(path, index) in found.paths" :key="index" class="path">
			<li v-for="(step, at) in path" :key="at">
				<button
					type="button"
					:class="{ end: at === path.length - 1 }"
					@click="emit('pick', step)"
				>
					<NodeLabel :graph="graph" :id="step" />
				</button>
			</li>
		</ol>
		<p v-if="found.truncated" class="more">The first {{ limit }} — there are more.</p>
	</div>
</template>

<style scoped>
.path-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.path {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;
}

li {
	display: flex;
	align-items: center;
}

li + li::before {
	content: '›';
	margin: 0 3px;
	color: var(--theme--foreground-subdued);
}

button {
	padding: 1px 4px;
	font: inherit;
	font-size: 13px;
	color: var(--theme--foreground);
	background: none;
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

button:hover {
	background: var(--theme--background-normal);
}

button.end {
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.more {
	margin: 0;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}
</style>
