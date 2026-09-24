<script setup lang="ts">
import { computed, inject, watchEffect } from 'vue';
import { iconRendererKey, icons, requestIcon } from '../icons';

const props = defineProps<{ name: string }>();

const renderer = inject(iconRendererKey, null);
watchEffect(() => renderer || requestIcon(props.name));
const icon = computed(() => icons.get(props.name));
</script>

<template>
	<component :is="renderer" v-if="renderer" :name="name" class="node-icon" />
	<!-- The box is there before the icon lands, so nothing shifts when it does -->
	<svg v-else class="node-icon" :viewBox="icon?.viewBox ?? '0 0 24 24'" aria-hidden="true">
		<g v-if="icon" v-html="icon.body" />
	</svg>
</template>

<style scoped>
.node-icon {
	flex-shrink: 0;
	width: 1.15em;
	height: 1.15em;
}
</style>
