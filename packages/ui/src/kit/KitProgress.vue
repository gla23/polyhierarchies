<script setup lang="ts">
/** Directus's v-progress-linear, indeterminate only: a thin bar sliding across */
defineProps<{ indeterminate?: boolean }>();
</script>

<template>
	<div class="v-progress-linear"><div class="bar" /></div>
</template>

<style scoped>
.v-progress-linear {
	position: relative;
	height: 2px;
	overflow: hidden;
	background: var(--theme--background-normal);
}

.bar {
	width: 30%;
	height: 100%;
	background: var(--theme--primary);
	animation: slide 1s var(--transition) infinite;
}

@keyframes slide {
	from {
		transform: translateX(-100%);
	}

	to {
		transform: translateX(340%);
	}
}
</style>
