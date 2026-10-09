<script setup lang="ts">
import NodeIcon from '../components/NodeIcon.vue';

/** Directus's v-icon: a Material Symbol, 24px or 18px small, in the colour it's given */
defineProps<{ name: string; small?: boolean; clickable?: boolean }>();
</script>

<template>
	<span class="v-icon" :class="{ small, clickable }"><NodeIcon :name="name" /></span>
</template>

<style scoped>
.v-icon {
	--size: var(--v-icon-size, 24px);
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--size);
	height: var(--size);
	font-size: var(--size);
	color: var(--v-icon-color, currentColor);
}

.v-icon.small {
	--size: 18px;
}

.v-icon :deep(.node-icon) {
	width: 1em;
	height: 1em;
}

.clickable {
	cursor: pointer;
}
</style>
