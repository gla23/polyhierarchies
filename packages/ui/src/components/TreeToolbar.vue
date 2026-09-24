<script setup lang="ts">
import type { useTree } from '../tree';

defineProps<{ tree: ReturnType<typeof useTree>; focus: string | null }>();
</script>

<template>
	<div class="tree-toolbar">
		<button type="button" @click="tree.unfoldAll">Unfold all</button>
		<button type="button" :disabled="!focus" @click="tree.foldToFocus">Fold to focus</button>
		<button type="button" @click="tree.foldAll">Fold all</button>
		<slot />
	</div>
</template>

<style scoped>
.tree-toolbar {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 12px;
}

button {
	padding: 4px 10px;
	font: inherit;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
	background: none;
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

button:hover:not(:disabled) {
	color: var(--theme--foreground);
	border-color: var(--theme--border-color-accent);
}

button:disabled {
	cursor: default;
	opacity: 0.5;
}
</style>
