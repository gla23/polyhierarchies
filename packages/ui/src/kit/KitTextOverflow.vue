<script setup lang="ts">
/** Directus's v-text-overflow: one line, cut short with an ellipsis */
defineProps<{ text: string | number; placement?: string; highlight?: string }>();
</script>

<template>
	<span class="v-text-overflow">{{ text }}</span>
</template>

<style scoped>
.v-text-overflow {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
