<script setup lang="ts">
import { createGraph, invert } from '@polyhierarchies/core';
import { densityStyles } from '@polyhierarchies/ui';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { current } from '../store';
import { uis } from '../uis';
import ExploreLink from './ExploreLink.vue';

/** One of the Explore UIs, live and read only, with a link that opens the same view in Explore */
const props = withDefaults(
	defineProps<{
		ui: string;
		data: string;
		focus?: string;
		options?: Record<string, string | number>;
		dir?: 'down' | 'up';
		height?: number;
	}>(),
	{ height: 380, dir: 'down' }
);

const entry = computed(() => uis.find((each) => each.id === props.ui)!);
const graph = computed(() => {
	const data = current[props.data]!;
	return createGraph(props.dir === 'up' ? invert(data) : data);
});
const startFocus = () => props.focus ?? current[props.data]!.start ?? null;
const focus = ref(startFocus());
watch(() => [props.data, props.focus], () => (focus.value = startFocus()));

const bound = computed(() => ({
	...Object.fromEntries(entry.value.options.map((option) => [option.key, option.default])),
	...props.options
}));
const density = computed(() => String(bound.value.density ?? 'cosy') as keyof typeof densityStyles);

/**
 * Scrolls the demo's own box, never the page, to where the focus is drawn in full: the point of the
 * example is usually there, and a tall tree would otherwise open far above it.
 */
const stage = ref<HTMLElement>();
async function showFocus() {
	await nextTick();
	// After the rows' entrance, which moves them
	setTimeout(() => {
		const box = stage.value;
		const target = box?.querySelector(`[data-full-id="${CSS.escape(focus.value ?? '')}"]`);
		if (!box || !target) return;
		const offset = target.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
		box.scrollTop = Math.max(0, offset - box.clientHeight / 3);
	}, 250);
}
onMounted(showFocus);
watch(bound, showFocus);
</script>

<template>
	<figure class="demo">
		<div ref="stage" class="stage" :style="{ height: `${height}px`, ...densityStyles[density] }">
			<component
				:is="entry.component"
				:key="`${ui}:${data}:${dir}`"
				v-model:focus="focus"
				:graph="graph"
				v-bind="bound"
			/>
		</div>
		<figcaption>
			<span><slot /></span>
			<ExploreLink class="open-in-explore" :to="{ ui, data, focus, options, dir }">Open in Explore ↗</ExploreLink>
		</figcaption>
	</figure>
</template>

<style scoped>
.demo {
	margin: 16px 0 24px;
}

.stage {
	padding: 12px;
	overflow: auto;
	background: var(--theme--background);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
}

figcaption {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 16px;
	margin-top: 6px;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}

.open-in-explore {
	flex-shrink: 0;
	color: var(--theme--primary);
}
</style>
