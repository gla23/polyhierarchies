<script setup lang="ts">
import { computed } from 'vue';
import KitIcon from './KitIcon.vue';

/** Directus's v-checkbox as the table uses it: an icon that's a box, ticked, or part-ticked */
const props = defineProps<{ modelValue?: boolean; indeterminate?: boolean; iconOn?: string; iconOff?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const icon = computed(() =>
	props.indeterminate
		? 'indeterminate_check_box'
		: props.modelValue
			? (props.iconOn ?? 'check_box')
			: (props.iconOff ?? 'check_box_outline_blank')
);
</script>

<template>
	<button
		type="button"
		class="v-checkbox"
		role="checkbox"
		:aria-checked="indeterminate ? 'mixed' : !!modelValue"
		:class="{ checked: modelValue || indeterminate }"
		@click.stop="emit('update:modelValue', !modelValue)"
	>
		<KitIcon :name="icon" />
	</button>
</template>

<style scoped>
.v-checkbox {
	display: inline-flex;
	padding: 0;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	cursor: pointer;
}

.v-checkbox:hover {
	color: var(--theme--foreground);
}

.v-checkbox.checked {
	color: var(--theme--primary);
}
</style>
