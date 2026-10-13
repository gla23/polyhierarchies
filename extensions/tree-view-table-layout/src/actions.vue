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
	search?: string | null;
	searchMode?: 'routes' | 'inplace';
	setLayoutOptions?: (changes: Record<string, unknown>) => void;
	modeMenus?: boolean;
	searchMenu?: boolean;
	selectMode?: boolean;
}>();

/** What a filter does to the tree, each in a line, as the menu shows them */
const treeModes = [
	{ value: 'hide', text: 'Hide', description: 'What doesn’t match isn’t displayed. To preserve the hierarchy parents with matching children are shown demphasised.' },
	{ value: 'routes', text: 'Routes', description: 'Highlight the matches and open every way to them. The rest is hidden.' },
	{ value: 'inplace', text: 'In place', description: 'Highlight the matches where they are. Your folds stay, and say how many matches they hold.' },
	{ value: 'off', text: 'Off', description: 'Disable the filter without losing your query.' },
] as const;
/** A flat list has no ways to a match to open, so Routes hides, as Hide does */
const flatModes = [
	{ value: 'hide', text: 'Hide', description: 'What doesn’t match isn’t shown.' },
	{ value: 'inplace', text: 'In place', description: 'Everything is shown, and the matches are highlighted.' },
	{ value: 'off', text: 'Off', description: 'Disable the filter without losing your query.' },
] as const;
/** A search's: no Off (that's clearing it), and flat, showing only the matches is its routes */
const treeSearchModes = treeModes.filter((mode) => mode.value === 'routes' || mode.value === 'inplace');
const flatSearchModes = [
	{ value: 'routes', text: 'Hide', description: 'What doesn’t match isn’t shown, as Directus’s own search does.' },
	flatModes[1],
] as const;
const modeOf = (mode: LayerMode) => (!props.treeActive && mode === 'routes' ? 'hide' : mode);

/**
 * The key on Next only while that key would do the same: while this bar's search box has focus,
 * with something in it. Anywhere else Enter does something else (in the table, it opens the row),
 * and picking items, Enter in the search picks, so it's ↓.
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
	(!props.treeActive || (props.matches && props.highlightMode === 'routes')
		? 'Select the next match, in the order the rows run, and carry on from it with the arrow keys.'
		: 'Select the next match, opening the folds on the way to it and no others, and carry on from it with the arrow keys.')
	+ (props.selectMode
		? ' ↓ in the search does the same, and Shift-click or ↑ goes back. Enter in the search then picks it, and ⌘/Ctrl+Enter picks it and saves.'
		: ' ↓ or Enter in the search does the same, and Shift-click, ↑ or Shift+Enter goes back. ⌘/Ctrl+Enter opens it.')
	+ (!props.treeActive
		? ''
		: props.matches && props.highlightMode === 'routes'
			? ' Its way stays open, so clearing the search lands on it.'
			: ' They stay open, so clearing the search lands on it.'),
);
/** Each menu only while there's a filter or a search to say it about */
const filtering = computed(() => {
	const filter = props.filterUser as Record<string, unknown> | null | undefined;
	if (!filter || !Object.keys(filter).length)
		return false;
	const all = filter._and;
	return !(Array.isArray(all) && !all.length);
});
const layers = computed(() => {
	const shape = props.treeActive ? 'tree' : 'list';
	return [
		...(props.searchMenu && props.search?.trim()
			? [{ key: 'searchMode', label: 'Search', mode: props.searchMode ?? 'routes', modes: props.treeActive ? treeSearchModes : flatSearchModes, tip: `What the search does to the ${shape}` }]
			: []),
		...(props.modeMenus !== false && filtering.value
			? [{ key: 'filterMode', label: 'Filter', mode: modeOf(props.filterMode ?? 'hide'), modes: props.treeActive ? treeModes : flatModes, tip: `What the filter does to the ${shape}` }]
			: []),
	];
});
const textOf = (modes: readonly { value: string; text: string }[], value: string) => modes.find((mode) => mode.value === value)?.text ?? value;
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
		v-if="offerNext && matchPosition?.of && goToMatch"
		ref="nextButton"
		v-tooltip.bottom="nextTip"
		class="next"
		small
		secondary
		@click="goToMatch($event.shiftKey ? -1 : 1)"
	>
		{{ matchPosition.at ? `${matchPosition.at}/${matchPosition.of}` : 'Next' }}<template v-if="enterGoesNext">&nbsp;<span class="enter">{{ selectMode ? '↓' : '↵' }}</span></template>
	</v-button>
	<!-- Not while picking items: a drawer's header is narrow, and they pushed its Save button off screen -->
	<template v-if="setLayoutOptions && !selectMode">
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
					<span class="mode-label">{{ layer.label }}:</span>&nbsp;{{ textOf(layer.modes, layer.mode) }}
				</v-button>
			</template>
			<v-list class="modes">
				<v-list-item
					v-for="mode in layer.modes"
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
