<script setup lang="ts">
defineOptions({ inheritAttrs: false });

import type { LayerMode } from './types';
import { computed } from 'vue';

const props = defineProps<{
	showingCount?: string;
	/** Searching a tree: the matches, and how they show */
	matches?: Set<string> | null;
	highlightMode?: 'routes' | 'inplace';
	/** Which match Enter last went to, of how many, and a way to go to the next */
	matchPosition?: { at: number | null; of: number } | null;
	goToMatch?: (step?: 1 | -1) => void;
	treeActive?: boolean;
	filterMode?: LayerMode;
	searchMode?: LayerMode;
	setLayoutOptions?: (changes: Record<string, unknown>) => void;
	modeMenus?: boolean;
}>();

/** What a filter or a search does to the tree, each in a line, as the menus show them */
const modes = [
	{ value: 'hide', text: 'Hide', description: 'What doesn’t match isn’t shown. Nothing is highlighted, and your folds stay.' },
	{ value: 'routes', text: 'Routes', description: 'Highlight the matches and open every way to them. The rest is hidden.' },
	{ value: 'inplace', text: 'In place', description: 'Highlight the matches where they are. Your folds stay, and say how many they hold.' },
	{ value: 'off', text: 'Off', description: 'Set aside: the tree ignores it until you pick another mode. Nothing is cleared.' },
] as const;

/** One way of going to a match in every mode; it only differs in what has to open first */
const nextTip = computed(() =>
	props.matches && props.highlightMode === 'routes'
		? 'Enter: the next match, in the order the rows run (Shift+Enter: back). Its way stays open in your tree, so clearing the search lands on it.'
		: 'Enter: the next match, opening the folds on the way to it and no others (Shift+Enter: back). They stay open, so clearing the search lands on it.',
);
// In the order of Directus's own controls beside them: search, then filter
const layers = computed(() => [
	{ key: 'searchMode', label: 'Search', mode: props.searchMode ?? 'routes', tip: 'What a search does to the tree' },
	{ key: 'filterMode', label: 'Filter', mode: props.filterMode ?? 'hide', tip: 'What a filter does to the tree' },
]);
const textOf = (value: string) => modes.find((mode) => mode.value === value)?.text ?? value;
</script>

<template>
	<transition name="fade">
		<span
			v-if="showingCount"
			class="item-count"
		>
			{{ showingCount }}
		</span>
	</transition>
	<v-button
		v-if="treeActive && matchPosition?.of && goToMatch"
		v-tooltip.bottom="nextTip"
		class="next"
		small
		secondary
		@click="goToMatch(1)"
	>
		{{ matchPosition.at ? `${matchPosition.at}/${matchPosition.of}` : 'Next' }}&nbsp;<span class="enter">↵</span>
	</v-button>
	<template v-if="treeActive && setLayoutOptions && modeMenus !== false">
		<v-menu
			v-for="layer in layers"
			:key="layer.key"
			placement="bottom-end"
			show-arrow
		>
			<template #activator="{ toggle }">
				<v-button
					v-tooltip.bottom="layer.tip"
					class="mode-button"
					small
					secondary
					@click="toggle"
				>
					<span class="mode-label">{{ layer.label }}:</span>&nbsp;{{ textOf(layer.mode) }}
				</v-button>
			</template>
			<v-list class="modes">
				<v-list-item
					v-for="mode in modes"
					:key="mode.value"
					clickable
					:active="layer.mode === mode.value"
					@click="setLayoutOptions!({ [layer.key]: mode.value })"
				>
					<v-list-item-content>
						<div class="mode">
							<span class="mode-name">{{ mode.text }}</span>
							<small>{{ mode.description }}</small>
						</div>
					</v-list-item-content>
				</v-list-item>
			</v-list>
		</v-menu>
	</template>
</template>

<style lang="scss" scoped>
.next,
.mode-button {
	margin-right: 8px;
}

.enter {
	color: var(--theme--foreground-subdued);
}

.mode-label {
	color: var(--theme--foreground-subdued);
}

.modes {
	max-width: 300px;
}

.mode {
	display: flex;
	flex-direction: column;
	gap: 2px;
	white-space: normal;
}

.mode-name {
	font-weight: 600;
}

.mode small {
	color: var(--theme--foreground-subdued);
}

    .item-count {
	position: relative;
	display: none;
	margin: 0 8px;
	color: var(--theme--foreground-subdued);
	white-space: nowrap;

	@media (min-width: 600px) {
		display: inline;
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity var(--medium) var(--transition);
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
