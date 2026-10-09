<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

/** Directus's v-menu, as far as the table needs it: an activator that toggles a popover below */
defineProps<{ placement?: string; showArrow?: boolean }>();
const active = ref(false);
const root = ref<HTMLElement>();
const toggle = () => (active.value = !active.value);
const outside = (event: PointerEvent) => {
	if (!root.value?.contains(event.target as Node)) active.value = false;
};
watch(active, (open) =>
	open ? addEventListener('pointerdown', outside) : removeEventListener('pointerdown', outside)
);
onBeforeUnmount(() => removeEventListener('pointerdown', outside));
</script>

<template>
	<div ref="root" class="v-menu">
		<slot name="activator" :toggle="toggle" :active="active" />
		<div v-if="active" class="v-menu-content" @click="active = false"><slot /></div>
	</div>
</template>

<style scoped>
.v-menu {
	position: relative;
}

.v-menu-content {
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	z-index: 10;
	min-width: 180px;
	padding: 4px;
	background: var(--theme--popover--menu--background);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
}
</style>
