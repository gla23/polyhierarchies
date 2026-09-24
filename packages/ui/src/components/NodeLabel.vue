<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import { computed } from 'vue';
import NodeIcon from './NodeIcon.vue';

/** A node as every UI draws it: icon in its colour, label, and the marks a polyhierarchy needs */
const props = defineProps<{
	graph: Graph;
	id: string;
	duplicate?: boolean;
	loop?: boolean;
	/** Drawn in full here, but also elsewhere: a live copy rather than a pointer to the real one */
	mirror?: boolean;
}>();

const node = computed(() => props.graph.node(props.id));
const parents = computed(() => props.graph.parents(props.id));
</script>

<template>
	<span class="node-label">
		<NodeIcon v-if="node.icon" :name="node.icon" :style="{ color: node.colour }" />
		<span v-else-if="node.colour" class="dot" :style="{ background: node.colour }" />
		<span class="text">{{ node.label }}</span>
		<svg v-if="loop" class="mark" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" />
		</svg>
		<svg v-else-if="duplicate" class="mark" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M7 17 17 7M9 7h8v8" />
		</svg>
		<svg v-else-if="mirror" class="mark mirror" viewBox="0 0 24 24" aria-hidden="true">
			<path d="M4 9h14l-4-4M20 15H6l4 4" />
		</svg>
		<!-- The mark of a polyhierarchy: this node also lives somewhere else -->
		<span
			v-if="parents.length > 1"
			class="parent-count"
			:title="`${parents.length} parents: ${parents.map(graph.label).join(', ')}`"
			>{{ parents.length }}</span
		>
	</span>
</template>

<style scoped>
.node-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.text {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.dot {
	flex-shrink: 0;
	width: 0.6em;
	height: 0.6em;
	border-radius: 50%;
}

.mark {
	flex-shrink: 0;
	width: 0.9em;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
}

.mark.mirror {
	color: var(--theme--primary);
}

.parent-count {
	flex-shrink: 0;
	min-width: 1.4em;
	padding: 0 4px;
	font-size: 0.75em;
	line-height: 1.4em;
	text-align: center;
	color: var(--theme--foreground-subdued);
	border: var(--theme--border-width) solid var(--theme--border-color-accent);
	border-radius: 999px;
}
</style>
