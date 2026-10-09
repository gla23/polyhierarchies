<script setup lang="ts">
defineOptions({ inheritAttrs: false });

import type { Filter } from '@directus/types';
import type { LayerMode } from './types';
import type { ComponentPublicInstance } from 'vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
	showingCount?: string;
	/** Searching a tree: the matches, and how they show */
	matches?: Set<string> | null;
	highlightMode?: 'routes' | 'inplace';
	/** Which match Enter last went to, of how many, and a way to go to the next */
	matchPosition?: { at: number | null; of: number } | null;
	goToMatch?: (step?: 1 | -1) => void;
	/** Some of what's shown matches, not all: a next one to go to */
	offerNext?: boolean;
	treeActive?: boolean;
	filterMode?: LayerMode;
	filterUser?: Filter | null;
	setLayoutOptions?: (changes: Record<string, unknown>) => void;
	modeMenus?: boolean;
	selectMode?: boolean;
}>();

/** What a filter does to the tree, each in a line, as the menu shows them */
const modes = [
	{ value: 'hide', text: 'Hide', description: 'What doesn’t match isn’t shown. Nothing is highlighted, and your folds stay.' },
	{ value: 'routes', text: 'Routes', description: 'Highlight the matches and open every way to them. The rest is hidden.' },
	{ value: 'inplace', text: 'In place', description: 'Highlight the matches where they are. Your folds stay, and say how many they hold.' },
	{ value: 'off', text: 'Off', description: 'Set aside: the tree ignores it until you pick another mode. Nothing is cleared.' },
] as const;

/**
 * The ↵ on Next only while Enter would do the same: while this bar's search box has focus, with
 * something in it. Anywhere else Enter does something else (in the table, it opens the row).
 */
const nextButton = ref<ComponentPublicInstance>();
const enterGoesNext = ref(false);
function trackFocus() {
	const bar = (nextButton.value?.$el as HTMLElement | undefined)?.closest?.('.header-bar');
	const active = document.activeElement as HTMLInputElement | null;
	enterGoesNext.value = !!bar && !!active && bar.contains(active) && !!active.closest('.search-input') && !!active.value?.trim();
}
const later = () => setTimeout(trackFocus);
onMounted(() => {
	window.addEventListener('focusin', trackFocus);
	window.addEventListener('focusout', later);
	window.addEventListener('input', trackFocus, true);
});
onBeforeUnmount(() => {
	window.removeEventListener('focusin', trackFocus);
	window.removeEventListener('focusout', later);
	window.removeEventListener('input', trackFocus, true);
});
watch(() => props.offerNext, () => nextTick(trackFocus));

/** One way of going to a match in every mode; it only differs in what has to open first */
const nextTip = computed(() =>
	(props.matches && props.highlightMode === 'routes'
		? 'Select the next match, in the order the rows run, and carry on from it with the arrow keys. Shift-click, or Shift+Enter in the search, goes back. Its way stays open, so clearing the search lands on it.'
		: 'Select the next match, opening the folds on the way to it and no others, and carry on from it with the arrow keys. Shift-click, or Shift+Enter in the search, goes back. They stay open, so clearing the search lands on it.')
	+ (props.selectMode ? ' ⌘/Ctrl+Enter then picks it and saves.' : ''),
);
/**
 * The filter's menu, only while there's a filter to say it about. A search has no menu: its two ways
 * barely differ in use, so that's a sidebar setting.
 */
const filtering = computed(() => {
	const filter = props.filterUser as Record<string, unknown> | null | undefined;
	if (!filter || !Object.keys(filter).length)
		return false;
	const all = filter._and;
	return !(Array.isArray(all) && !all.length);
});
const layers = computed(() => (filtering.value ? [{ key: 'filterMode', label: 'Filter', mode: props.filterMode ?? 'hide', tip: 'What the filter does to the tree' }] : []));
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
		v-if="treeActive && offerNext && matchPosition?.of && goToMatch"
		ref="nextButton"
		v-tooltip.bottom="nextTip"
		class="next"
		small
		secondary
		@click="goToMatch($event.shiftKey ? -1 : 1)"
	>
		{{ matchPosition.at ? `${matchPosition.at}/${matchPosition.of}` : 'Next' }}<template v-if="enterGoesNext">&nbsp;<span class="enter">↵</span></template>
	</v-button>
	<!-- Not while picking items: a drawer's header is narrow, and they pushed its Save button off screen -->
	<template v-if="treeActive && setLayoutOptions && modeMenus !== false && !selectMode">
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
