<script setup lang="ts">
import { computed, inject } from 'vue';
import { navigateKey, playgroundHref, type PlaygroundState } from '../links';
import { current } from '../store';
import { uis } from '../uis';

/**
 * A real link to a state of the playground, so it can be opened in a new tab or copied; a plain
 * click switches to it in place instead of reloading.
 */
const props = defineProps<{ to: PlaygroundState; hash?: string }>();
const navigate = inject(navigateKey, null);

const href = computed(() => playgroundHref(props.to) + (props.hash ? `#${props.hash}` : ''));

/** What it opens, for a link with no text of its own: "Tree lab · Food · Tomato · Mirrors" */
const description = computed(() => {
	const { ui: uiId, data, focus, options = {}, dir } = props.to;
	const ui = uis.find((entry) => entry.id === uiId);
	const dataset = data ? current[data] : undefined;
	const node = focus && dataset?.nodes.find((each) => each.id === focus);
	const settings = Object.entries(options).map(([key, value]) => {
		const option = ui?.options.find((each) => each.key === key);
		const choice = option?.choices?.find((each) => each.value === value);
		return choice ? choice.label : `${option?.label ?? key} ${value}`;
	});
	return [ui?.name, dataset?.name, node && node.label, ...settings, dir === 'up' && 'Parents below']
		.filter(Boolean)
		.join(' · ');
});

function follow(event: MouseEvent) {
	// A new tab, a download or a window is the browser's business
	if (!navigate || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
		return;
	event.preventDefault();
	navigate(href.value);
}
</script>

<template>
	<a :href="href" class="explore-link" @click="follow"><slot>{{ description }}</slot></a>
</template>
