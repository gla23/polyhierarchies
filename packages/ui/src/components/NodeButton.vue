<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import { computed } from 'vue';
import NodeLabel from './NodeLabel.vue';

const props = defineProps<{
	graph: Graph;
	id: string;
	current?: boolean;
	echo?: boolean;
	/** A repeat of a node shown in full elsewhere, drawn as terminal */
	duplicate?: boolean;
	/** A duplicate that is also one of its own ancestors: where a cycle closes */
	loop?: boolean;
	mirror?: boolean;
}>();

const fullUnder = computed(() => props.graph.spanningParent(props.id));
</script>

<template>
	<button
		type="button"
		class="node-button"
		:class="{ current, echo, duplicate, loop }"
		:title="
			loop
				? `Loops back to ${graph.label(id)} above`
				: duplicate
					? `Shown in full under ${fullUnder ? graph.label(fullUnder) : 'the top level'}`
					: mirror
						? `A mirror: also under ${graph.parents(id).map(graph.label).join(', ')}`
						: undefined
		"
	>
		<NodeLabel :graph="graph" :id="id" :duplicate="duplicate" :loop="loop" :mirror="mirror" />
	</button>
</template>

<style scoped>
.node-button {
	display: inline-flex;
	align-items: center;
	max-width: 100%;
	padding: var(--node-padding-y, 4px) 10px;
	font: inherit;
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.node-button:hover,
.node-button.echo {
	border-color: var(--theme--primary);
}

.node-button.current {
	color: var(--theme--foreground-accent);
	background: var(--theme--primary-background);
	border-color: var(--theme--primary);
}

.node-button.duplicate {
	color: var(--theme--foreground-subdued);
	background: none;
	border-style: dashed;
}

.node-button.loop {
	color: var(--theme--warning);
	border-color: color-mix(in srgb, var(--theme--warning) 50%, transparent);
}
</style>
