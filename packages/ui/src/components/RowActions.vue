<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import type { GraphEditor } from '../editing';
import type { TreeRow } from '../tree';

const props = defineProps<{ graph: Graph; row: TreeRow; editor: GraphEditor }>();
const emit = defineEmits<{ added: [row: TreeRow] }>();

function addChild() {
	props.editor.open(props.editor.add(props.row.id));
	emit('added', props.row);
}

/** Only this placement: a node under several parents keeps the others */
function remove() {
	const { row, editor, graph } = props;
	if (row.parent) editor.unlink(row.parent, row.id);
	else if (confirm(`Delete ${graph.label(row.id)}?`)) editor.remove(row.id);
}
</script>

<template>
	<span class="row-actions">
		<button v-if="row.full" type="button" title="Add a child" @click.stop="addChild">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
		</button>
		<button type="button" title="Edit" @click.stop="editor.open(row.id)">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16z" />
			</svg>
		</button>
		<button
			type="button"
			:title="row.parent ? `Remove from ${graph.label(row.parent)}` : 'Delete'"
			@click.stop="remove"
		>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
		</button>
	</span>
</template>

<style scoped>
.row-actions {
	display: inline-flex;
	gap: 2px;
	opacity: 0;
	transition: opacity 0.1s;
}

/* The row owning them reveals them on hover (`.row:hover :deep(.row-actions)`); keyboard focus
   reveals them here */
.row-actions:focus-within {
	opacity: 1;
}

button {
	display: flex;
	padding: 3px;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

button:hover {
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
}

svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}
</style>
