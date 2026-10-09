<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import { computed, provide, reactive, ref } from 'vue';
import type { Density, GraphEditor, Motion } from '../../editing';
import { playgroundTableKit } from '../../kit';
import SharedTreeTable from '../../table/TreeTable.vue';
import { tableKitKey } from '../../table/kit';
import type { HeaderRaw, Item } from '../../table/types';
import type { Repeat } from '../../tree';
import KitIcon from '../../kit/KitIcon.vue';
import KitValueNull from '../../kit/KitValueNull.vue';
import NodeIcon from '../NodeIcon.vue';

/**
 * The Directus tree view layout itself, given the playground's data: the same component the
 * extension draws, with look-alikes for its few Directus pieces, and drops turned into `GraphEditor`
 * moves. What it can't do here is what Directus can't either; the Tree lab is for the rest.
 */
const props = withDefaults(
	defineProps<{
		graph: Graph;
		editor?: GraphEditor;
		density?: Density;
		motion?: Motion;
		/** Every other placement as a terminal duplicate, or drawn in full as a mirror */
		repeat?: Repeat;
		/** The faint lines from an open item's chevron down everything inside it */
		guides?: 'shown' | 'hidden';
		/** How many levels start open, as the layout's option; negative opens everything */
		openDepth?: number | string;
		/** The column the hierarchy indents: Name, or none, so only the controls indent */
		treeColumn?: 'label' | 'controls';
		/**
		 * While searching: hide what doesn't match (no highlight, folds kept); show the routes to the
		 * matches; or keep the folds and mark the matches
		 */
		searchMode?: 'hide' | 'routes' | 'inplace';
		/** The most levels Unfold all and a search's routes open, as the layout's option; negative, no limit */
		maxOpenDepth?: number | string;
		/** What a click on a row does: open it, as Directus does, or select it (double-click opens) */
		click?: 'opens' | 'selects';
	}>(),
	{ density: 'compact', motion: 'auto', repeat: 'once', guides: 'shown', openDepth: 2, treeColumn: 'label', searchMode: 'routes', maxOpenDepth: 5, click: 'opens' }
);
const focus = defineModel<string | null>('focus', { default: null });

provide(tableKitKey, playgroundTableKit);

/** Directus's three row heights */
const rowHeights: Record<Density, number> = { compact: 32, cosy: 48, comfortable: 64 };

/** Each node as an item, with its fields alongside and a sort value in the order the dataset gives */
const items = computed<Item[]>(() =>
	props.graph.data.nodes.map((node, index) => ({ id: node.id, label: node.label, sort: index + 1, ...node.fields }))
);

/** Widths and order as dragged, kept here as the layout keeps them in its preset */
const widths = reactive<Record<string, number>>({});
const order = ref<string[]>([]);
const headers = computed<HeaderRaw[]>(() => {
	const all: HeaderRaw[] = [
		{ text: 'Name', value: 'label' },
		...(props.graph.data.columns ?? []).map((column) => ({
			text: column.label,
			value: column.key,
			align: column.type === 'number' ? ('right' as const) : ('left' as const)
		}))
	];
	const rank = (key: string) => {
		const index = order.value.indexOf(key);
		return index < 0 ? order.value.length : index;
	};
	return all
		.sort((a, b) => rank(a.value) - rank(b.value))
		// Sorting by a column is Directus's query's job; with no query, the hierarchy's order stands
		.map((header) => ({ ...header, sortable: false, width: widths[header.value] ?? (header.value === 'label' ? 240 : 160) }));
});
function onHeaders(next: HeaderRaw[]) {
	order.value = next.map((header) => header.value);
	for (const header of next) if (header.width) widths[header.value] = header.width;
}

/** Drawn as Directus's boolean display does, a tick, rather than the word */
const booleanColumns = computed(() => (props.graph.data.columns ?? []).filter((column) => column.type === 'boolean'));

/**
 * Directus's search, here: a node matches when its name or any of its values contains the text. The
 * table keeps the tree and shows the routes to the matches, as the layout does.
 */
const search = ref('');
const matches = computed(() => {
	const wanted = search.value.trim().toLowerCase();
	if (!wanted) return null;
	return new Set(
		props.graph.data.nodes
			.filter((node) => [node.label, ...Object.values(node.fields ?? {})].some((value) => String(value ?? '').toLowerCase().includes(wanted)))
			.map((node) => node.id)
	);
});

const selection = ref<string[]>([]);
/** While searching, what the table shows and how much of it matches, as the layout's count says */
const showing = ref<{ items: number; matching: number } | null>(null);
/** Enter in the search goes to the next match; the one it's at, as the layout's Next button says */
const table = ref<InstanceType<typeof SharedTreeTable>>();
/** Some of what's shown matches, not all, as the layout has it: only then a next one, or a count */
const offerNext = computed(() => !!showing.value && showing.value.matching > 0 && showing.value.matching < showing.value.items);
/** The ↵ only while Enter would go next: the search box has focus, with something in it */
const searchFocused = ref(false);
const matchPosition = ref<{ at: number | null; of: number } | null>(null);
function goToMatch(event?: KeyboardEvent | MouseEvent) {
	table.value?.goToMatch(event?.shiftKey ? -1 : 1);
}
/** The Next button also hands the table the keys, so the arrows carry on from the match */
function nextFromButton(event: MouseEvent) {
	goToMatch(event);
	table.value?.focusTable();
}
const sort = ref({ by: 'sort', desc: false });

/** A click opens the item, as Directus opens the item page; here that's the focus and the editor */
function onRowClick({ item }: { item: Item }) {
	const id = (item['--node'] as string | undefined) ?? (item.id as string);
	focus.value = id;
	props.editor?.open(id);
}

/** The selected row, with what can be done to it, as the layout's top bar offers in Directus */
const selected = ref<Item | null>(null);
const selectedParent = computed(() => String(selected.value?.['--key'] ?? '').split('/').at(-2) ?? null);
function addChild() {
	const node = selected.value?.['--node'];
	if (!node || !props.editor) return;
	// Opened first, so the new one shows as it lands
	table.value?.unfoldCursor();
	props.editor.add(node);
}
function removeFromParent() {
	const node = selected.value?.['--node'];
	if (node && selectedParent.value && props.editor) props.editor.unlink(selectedParent.value, node);
}

type Moved = { node: string; from: string | null; to: string | null; index: number; link: boolean };
/** A drop moves that placement; with Alt held it adds the new parent and keeps the old */
function onEdits(edits: { moved?: Moved | null }) {
	const moved = edits.moved;
	if (!moved || !props.editor) return;
	if (moved.link && moved.to) props.editor.link(moved.to, moved.node);
	else props.editor.move(moved.node, moved.from, moved.to, moved.index);
}
</script>

<template>
	<div class="tree-table">
		<label class="search">
			<KitIcon name="search" small />
			<input
				v-model="search"
				type="search"
				placeholder="Search"
				@keydown.enter.prevent="goToMatch"
				@keydown.esc.prevent="table?.focusTable()"
				@focus="searchFocused = true"
				@blur="searchFocused = false"
			/>
			<button
				v-if="matches && offerNext && matchPosition?.of"
				type="button"
				class="next"
				title="Select the next match, opening the way to it, and carry on with the arrow keys (Shift-click, or Shift+Enter in the search, goes back). Esc in the search goes into the table too"
				@click="nextFromButton"
			>
				{{ matchPosition.at ? `${matchPosition.at}/${matchPosition.of}` : 'Next' }}{{ searchFocused && search.trim() ? ' ↵' : '' }}
			</button>
		</label>
		<p class="tops">
			<template v-if="showing">
				{{ showing.items }} {{ showing.items < graph.data.nodes.length ? 'filtered' : '' }}
				{{ showing.items === 1 ? 'item' : 'items' }}<template v-if="offerNext">, {{ showing.matching }} matching</template>
			</template>
			<template v-else>
				{{ graph.data.nodes.length }} {{ graph.data.nodes.length === 1 ? 'item' : 'items' }},
				{{ graph.roots.length }} {{ graph.roots.length === 1 ? 'root' : 'roots' }}
			</template>
		</p>
		<SharedTreeTable
			ref="table"
			v-model="selection"
			v-model:sort="sort"
			:headers="headers"
			:items="items"
			item-key="id"
			show-select="multiple"
			selection-use-keys
			show-resize
			allow-header-reorder
			:show-manual-sort="!!editor"
			manual-sort-key="sort"
			:readonly="!editor"
			:row-height="rowHeights[density]"
			:graph="graph"
			:repeat="repeat"
			:collection="`playground:${graph.data.id}`"
			:tree-column="treeColumn === 'controls' ? null : 'label'"
			:show-guides="guides === 'shown'"
			:open-depth="Number(openDepth) < 0 ? null : Number(openDepth)"
			:matches="searchMode === 'hide' ? null : matches"
			:keep="searchMode === 'hide' ? matches : null"
			:search-mode="searchMode === 'hide' ? 'routes' : searchMode"
			:searching="!!matches"
			:max-open-depth="Number(maxOpenDepth) < 0 ? null : Number(maxOpenDepth)"
			:motion="motion"
			:click-selects="click === 'selects'"
			@update:headers="onHeaders"
			@click:row="onRowClick"
			@update:items="onEdits"
			@showing="showing = $event"
			@match-position="matchPosition = $event"
			@cursor="selected = $event"
		>
			<!-- The selected row's actions, after its name, as the layout draws them -->
			<template #row-tools="{ item }">
				<!-- Only where a click selects: elsewhere a click already opens -->
				<button v-if="click === 'selects'" type="button" class="row-tool" title="Open it, as a double-click or Enter does" @click="onRowClick({ item })">
					<KitIcon name="open_in_new" small />
				</button>
				<template v-if="editor">
					<button type="button" class="row-tool" title="Add a new node inside it" @click="addChild">
						<KitIcon name="add_row_below" small />
					</button>
					<button
						v-if="selectedParent"
						type="button"
						class="row-tool"
						:title="`Take it out of ${graph.label(selectedParent)}, keeping it under any other parents`"
						@click="removeFromParent"
					>
						<KitIcon name="link_off" small />
					</button>
				</template>
			</template>
			<template #[`item.label`]="{ item }">
				<span class="label">
					<NodeIcon
						v-if="graph.node(item['--node'] ?? item.id).icon"
						:name="graph.node(item['--node'] ?? item.id).icon!"
						:style="{ color: graph.node(item['--node'] ?? item.id).colour }"
					/>
					<span>{{ item.label }}</span>
				</span>
			</template>
			<template v-for="column in booleanColumns" :key="column.key" #[`item.${column.key}`]="{ item }">
				<KitIcon v-if="item[column.key]" name="check" small />
				<KitValueNull v-else />
			</template>
		</SharedTreeTable>
	</div>
</template>

<style scoped>
.tree-table {
	min-width: 0;
}

.search {
	display: flex;
	align-items: center;
	gap: 6px;
	max-width: 320px;
	margin-bottom: 8px;
	padding: 4px 10px;
	color: var(--theme--foreground-subdued);
	background: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.search:focus-within {
	border-color: var(--theme--primary);
}

.search input {
	flex: 1;
	min-width: 0;
	padding: 2px 0;
	font: inherit;
	color: var(--theme--foreground);
	background: none;
	border: none;
	outline: none;
}

.next {
	flex-shrink: 0;
	padding: 1px 6px;
	font: inherit;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
	background: var(--theme--background-normal);
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.next:hover {
	color: var(--theme--foreground);
}

/* As Directus's x-small secondary icon buttons */
.row-tool {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	padding: 0;
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.row-tool:hover {
	background: var(--theme--background-accent);
}

.tops {
	margin: 0 0 8px;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}
</style>
