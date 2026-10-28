<script lang="ts">
/** Fetched once a page: the sidebar opens and closes often, and the schema rarely changes */
let cachedRelations: import('@directus/types').Relation[] | null = null;
</script>

<script setup lang="ts">
import type { Field, Relation } from '@directus/types';
// CORE CHANGES
// import { useSync } from '@directus/composables';
import { useApi, useSync } from '@directus/extensions-sdk';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFolds } from '@polyhierarchies/ui/table';
import type { LayerMode } from './types';

interface Props {
	fields: string[];
	activeFields: Field[];
	tableSpacing: 'compact' | 'cozy' | 'comfortable';
	hierarchy: 'taxonomy' | 'polyhierarchy' | 'flat';
	parentField: string | null;
	junction: string | null;
	junctionParent: string | null;
	junctionChild: string | null;
	junctionSort: string | null;
	treeColumn: string;
	searchMode: 'routes' | 'inplace';
	filterMode: LayerMode;
	modeMenus: boolean;
	searchMenu: boolean;
	showGuides: boolean;
	openDepth: number | null;
	maxOpenDepth: number | null;
	maxItems: number | null;
	rowClick: 'opens' | 'selects';
	sortField: string;
	collection: string;
	fieldsInCollection: any;
	/** Several options in one write, from the layout's setup (see there) */
	setLayoutOptions: (changes: Record<string, unknown>) => void;
}

const props = defineProps<Props>();

const emit = defineEmits([
	'update:tableSpacing',
	'update:hierarchy',
	'update:parentField',
	'update:junction',
	'update:junctionParent',
	'update:junctionChild',
	'update:junctionSort',
	'update:treeColumn',
	'update:searchMode',
	'update:filterMode',
	'update:modeMenus',
	'update:searchMenu',
	'update:showGuides',
	'update:openDepth',
	'update:maxOpenDepth',
	'update:maxItems',
	'update:rowClick',
	'update:activeFields',
	'update:fields',
]);

const { t } = useI18n();
const api = useApi();

const tableSpacingWritable = useSync(props, 'tableSpacing', emit);
const hierarchyWritable = useSync(props, 'hierarchy', emit);
const parentFieldWritable = useSync(props, 'parentField', emit);
const junctionParentWritable = useSync(props, 'junctionParent', emit);
const junctionChildWritable = useSync(props, 'junctionChild', emit);
const junctionSortWritable = useSync(props, 'junctionSort', emit);
const treeColumnWritable = useSync(props, 'treeColumn', emit);
const searchModeWritable = useSync(props, 'searchMode', emit);
const filterModeWritable = useSync(props, 'filterMode', emit);
const modeMenusWritable = useSync(props, 'modeMenus', emit);
const searchMenuWritable = useSync(props, 'searchMenu', emit);
// Flat, there are no routes or folds: a search shows only its matches or marks them among the rest
const searchModeItems = computed(() => (ready.value
	? [
			{ text: 'Show the routes to the matches', value: 'routes' },
			{ text: 'Keep my folds, mark the matches', value: 'inplace' },
		]
	: [
			{ text: 'Show only the matches', value: 'routes' },
			{ text: 'Show everything, mark the matches', value: 'inplace' },
		]));
const modeItems = computed(() => (ready.value
	? [
			{ text: 'Hide what doesn’t match', value: 'hide' },
			{ text: 'Show the routes to the matches', value: 'routes' },
			{ text: 'Keep my folds, mark the matches', value: 'inplace' },
			{ text: 'Off: set aside, not cleared', value: 'off' },
		]
	: [
			{ text: 'Hide what doesn’t match', value: 'hide' },
			{ text: 'Show everything, mark the matches', value: 'inplace' },
			{ text: 'Off: set aside, not cleared', value: 'off' },
		]));
/** Flat, showing the routes hides what doesn't match, as hiding does */
const filterModeShown = computed({
	get: () => (!ready.value && props.filterMode === 'routes' ? 'hide' : props.filterMode),
	set: (value: LayerMode) => (filterModeWritable.value = value),
});
const showGuidesWritable = useSync(props, 'showGuides', emit);
const openDepthWritable = useSync(props, 'openDepth', emit);
const maxOpenDepthWritable = useSync(props, 'maxOpenDepth', emit);
const maxItemsWritable = useSync(props, 'maxItems', emit);
/**
 * Stored a moment after typing stops: each change reloads everything, and on the way to 50000 it
 * would ask for 5, 50, 500 and 5000. Empty or 0 is no limit, -1 as stored.
 */
let maxItemsTimer: ReturnType<typeof setTimeout> | undefined;
const maxItemsShown = computed({
	get: () => (props.maxItems && props.maxItems > 0 ? props.maxItems : null),
	set: (value: number | string | null) => {
		clearTimeout(maxItemsTimer);
		const count = Math.floor(Number(value));
		maxItemsTimer = setTimeout(() => (maxItemsWritable.value = count > 0 ? count : -1), 600);
	},
});
const rowClickWritable = useSync(props, 'rowClick', emit);
const rowClickItems = [
	{ text: 'Opens it', value: 'opens' },
	{ text: 'Selects it (double-click opens)', value: 'selects' },
];
const maxOpenDepthItems = [
	...[2, 3, 4, 5, 6, 8, 10].map((depth) => ({ text: String(depth), value: depth })),
	{ text: 'No limit', value: -1 },
];

const hierarchyItems = [
    { text: 'Polyhierarchy: Any number of parents', value: 'polyhierarchy' },
	{ text: 'Taxonomy: One parent each', value: 'taxonomy' },
	{ text: 'Flat: Standard table with upgrades', value: 'flat' },
];

// Two when unset, as the layout's setup has it; -1 opens everything
const openDepthItems = [
	{ text: 'All', value: -1 },
	{ text: 'Top level only', value: 0 },
	...[1, 2, 3, 4].map((depth) => ({ text: String(depth), value: depth })),
];

/** Any shown field can be the one the hierarchy indents; usually the main text, which has room */
const treeColumnItems = computed(() => [
	{ text: 'None: only the controls indent', value: '$controls' },
	...(props.activeFields ?? []).map((field) => ({ text: field.name, value: field.field })),
]);

const { reset: resetFolds } = useFolds(props.collection);

const keys = /Mac|iPhone|iPad/.test(navigator.platform)
	? { inside: '⌘', siblings: '⌥' }
	: { inside: 'Ctrl', siblings: 'Alt' };

const selfReferencingM2oFields = computed(() => {
	return props.fieldsInCollection?.filter(
		(field: Field) =>
			['string', 'uuid', 'integer', 'bigInteger'].includes(
				field.type,
			)
			// && field.meta?.special?.includes('m2o')
			&& field.schema?.foreign_key_table === props.collection,
	);
});

/**
 * A polyhierarchy's links live in a junction: a collection with two many-to-one fields that both
 * point at this one, a parent and a child. Found from the relations rather than typed in.
 */
const relations = ref<Relation[]>(cachedRelations ?? []);
onMounted(async () => {
	if (cachedRelations)
		return;
	try {
		relations.value = cachedRelations = (await api.get('/relations')).data.data;
	}
	catch {
		relations.value = [];
	}
});
const fieldsTo = (junction: string) =>
	relations.value
		.filter((relation) => relation.collection === junction && relation.related_collection === props.collection)
		.map((relation) => relation.field);
const junctionItems = computed(() => {
	const collections = [...new Set(relations.value.map((relation) => relation.collection))];
	return collections
		.map((collection) => ({ collection, fields: fieldsTo(collection) }))
		.filter(({ fields }) => fields.length >= 2)
		.map(({ collection, fields }) => ({ text: `${collection} (${fields.join(', ')})`, value: collection }));
});
const junctionFieldItems = computed(() =>
	props.junction ? fieldsTo(props.junction).map((field) => ({ text: field, value: field })) : [],
);

/** The junction's integer fields, any of which can order one parent's children */
const junctionSortItems = ref<{ text: string; value: string }[]>([]);
watch(
	() => props.junction,
	async (junction) => {
		junctionSortItems.value = [];
		if (!junction)
			return;
		try {
			const fields: Field[] = (await api.get(`/fields/${junction}`)).data.data;
			junctionSortItems.value = fields
				.filter((field) => ['integer', 'bigInteger'].includes(field.type) && !field.schema?.is_primary_key)
				.map((field) => ({ text: field.field, value: field.field }));
		}
		catch {}
	},
	{ immediate: true },
);

/** A new junction: guess which field is the parent from its name; ⇅ puts it right */
function pickJunction(junction: string | null) {
	const fields = junction ? fieldsTo(junction) : [];
	const parent = fields.find((field) => /parent|broader|source|from/i.test(field)) ?? fields[0] ?? null;
	props.setLayoutOptions({
		junction,
		junctionParent: parent,
		junctionChild: fields.find((field) => field !== parent) ?? null,
		junctionSort: null,
	});
}

/** Parent and child the other way round: the same links, the hierarchy upside down */
function swap() {
	props.setLayoutOptions({ junctionParent: props.junctionChild, junctionChild: props.junctionParent });
}

const ready = computed(() =>
	props.hierarchy === 'polyhierarchy'
		? !!(props.junction && props.junctionParent && props.junctionChild)
		: !!props.parentField,
);

</script>

<template>
	<!-- Folded to start, so a hierarchy chosen but not set up, which shows flat, says so from outside -->
	<v-detail
		:label="ready || hierarchy === 'flat' ? 'Hierarchy' : '⚠️ Hierarchy'"
		class="section"
	>
		<div class="field">
			<div class="type-label">
				Type
			</div>
			<v-select
				v-model="hierarchyWritable"
				:items="hierarchyItems"
			/>
			<small
				v-if="hierarchy === 'flat'"
				class="type-note"
			>The items show as a flat list, nothing nested. {{ keys.inside }}+F goes to the search, where ↓ and ↑ go through the rows and Esc goes into the table. {{ keys.inside }}+Enter opens the one you're on, or picking items, Enter picks it and {{ keys.inside }}+Enter saves.</small>
		</div>

		<div
			v-if="hierarchy === 'taxonomy'"
			class="field"
		>
			<div class="type-label">
				Parent (M2O)
			</div>

			<v-notice
				v-if="!selfReferencingM2oFields?.length"
				type="info"
				class="setup"
			>
				<div>
					<p>This layout nests each item under its parent. Set these up in this collection's data model settings:</p>
					<ol>
						<li>
							<span :class="{ done: selfReferencingM2oFields?.length }">A parent field: a many-to-one field that relates to this same collection</span>
						</li>
						<li>
							<span v-if="sortField">✅ </span>
							<span :class="{ done: sortField }">Optionally, a sort field: an integer field, chosen as the collection's sort field, so rows can be dragged into place</span>
						</li>
					</ol>
					<p>Then choose the parent field here.</p>
				</div>
			</v-notice>

			<template v-else>
				<v-select
					v-model="parentFieldWritable"
					:items="selfReferencingM2oFields"
					item-text="name"
					item-value="field"
					show-deselect
					:placeholder="t('select_a_field')"
				/>

				<small
					v-if="!parentFieldWritable"
					class="type-note"
				>The field that holds each item's parent.<template v-if="sortField"> Choosing one can rewrite your items' sort values.</template></small>

				<v-notice
					v-if="!sortField"
					type="warning"
					class="setup"
				>
					<div>
						<p>This collection has no sort field, so the tree can't be dragged: rows can't be reordered, or moved to another parent by dropping them. A selected row can still be given a new parent from its actions.</p>
						<p>To drag rows into place, add an integer field and choose it as the collection's sort field in its data model settings.</p>
					</div>
				</v-notice>
			</template>
		</div>

		<template v-else-if="hierarchy === 'polyhierarchy'">
			<div class="field">
				<div class="type-label">
					Links (junction)
				</div>
				<v-notice
					v-if="!junctionItems.length"
					type="info"
					class="setup"
				>
					<div>
						<p>A polyhierarchy keeps its links in a junction collection. Each row is a parent-to-child link with two foreign keys pointing at this collection.</p>
						<p>To use this layout create a many-to-many from this collection to itself, then choose it here.</p>
					</div>
				</v-notice>
				<template v-else>
					<v-select
						:model-value="junction"
						:items="junctionItems"
						show-deselect
						placeholder="Choose the links collection"
						@update:model-value="pickJunction"
					/>
					<small class="type-note">Each row in this collection links a parent to a child. Dragging and reordering change these rows, not the items.</small>
				</template>
			</div>

			<div
				v-if="junction"
				class="field"
			>
				<div class="type-label">
					Parent and child
				</div>
				<div class="ends">
					<v-select
						v-model="junctionParentWritable"
						:items="junctionFieldItems"
						placeholder="Parent field"
					/>
					<v-button
						v-tooltip="'Swap: the same links, the hierarchy upside down'"
						class="swap"
						icon
						secondary
						small
						@click="swap"
					>
						<v-icon name="swap_vert" />
					</v-button>
					<v-select
						v-model="junctionChildWritable"
						:items="junctionFieldItems"
						placeholder="Child field"
					/>
				</div>
				<small class="type-note">Which field of a link holds the parent. Swap them to see everything an item belongs to, rather than what it contains.</small>
			</div>

			<div
				v-if="junction"
				class="field"
			>
				<div class="type-label">
					Order of children
				</div>
				<v-select
					v-model="junctionSortWritable"
					:items="[{ text: 'None: as the links were made', value: '$none' }, ...junctionSortItems]"
				/>
				<small class="type-note">An integer field on the links, so an item can have a different place under each parent. Without one, children can't be reordered.</small>
			</div>
		</template>
	</v-detail>

	<v-detail
		label="Display"
		class="section"
	>
		<div class="field">
			<div class="type-label">
				{{ t("layouts.tabular.spacing") }}
			</div>
			<v-select
				v-model="tableSpacingWritable"
				:items="[
					{
						text: t('layouts.tabular.compact'),
						value: 'compact',
					},
					{
						text: t('layouts.tabular.cozy'),
						value: 'cozy',
					},
					{
						text: t('layouts.tabular.comfortable'),
						value: 'comfortable',
					},
				]"
			/>
		</div>

		<div
			v-if="ready"
			class="field"
		>
			<div class="type-label">
				Indent up to
			</div>
			<v-select
				v-model="treeColumnWritable"
				:items="treeColumnItems"
			/>
			<small class="type-note">This column, and every column before it, moves right with each level, so the columns after it stay in line. Hints such as “12 below” appear in it. A column's own menu can choose it too: Indent up to this column.</small>
			<v-checkbox
				v-model="showGuidesWritable"
				block
				label="Lines down each open item"
				class="checkbox"
			/>
		</div>
	</v-detail>

	<template v-if="ready">
		<v-detail
			label="Folding"
			class="section"
		>
			<div class="field">
				<div class="type-label">
					Levels open to start
				</div>
				<v-select
					v-model="openDepthWritable"
					:items="openDepthItems"
				/>
				<small class="type-note">How many levels are open when the view loads. Folds you change are remembered in this browser.</small>
				<v-button
					class="reset-folds"
					small
					secondary
					@click="resetFolds"
				>
					Reset my folds
				</v-button>
			</div>

			<div class="field">
				<div class="type-label">
					Levels opened at most
				</div>
				<v-select
					v-model="maxOpenDepthWritable"
					:items="maxOpenDepthItems"
				/>
				<small class="type-note">The deepest that Unfold all and a search's routes will open, so a deep tree doesn't push the other columns off screen. Opening a single row, or going to one match, goes as deep as it needs.</small>
				<small class="type-note">{{ keys.inside }}-click a chevron to fold or unfold everything inside it, and {{ keys.siblings }}-click to include its siblings.<template v-if="hierarchy === 'polyhierarchy'"> Hold {{ keys.siblings }} as you drop a dragged row to add a parent rather than move it.</template></small>
			</div>
		</v-detail>
	</template>

	<v-detail
		label="Search and filters"
		class="section"
	>
		<div class="field">
			<div class="type-label">
				Search style
			</div>
			<v-select v-model="searchModeWritable" :items="searchModeItems" />
			<v-checkbox
				v-model="searchMenuWritable"
				block
				label="Show search menu"
				class="checkbox"
			/>
			<small class="type-note">Whether to put the above dropdown in the top bar for easy access. It only shows while there's a search.</small>
		</div>

		<div class="field">
			<div class="type-label">
				Filter style
			</div>
			<v-select v-model="filterModeShown" :items="modeItems" />
			<v-checkbox
				v-model="modeMenusWritable"
				block
				label="Show filter menu"
				class="checkbox"
			/>
			<small class="type-note">Whether to put the above dropdown in the top bar for easy access. It only shows while there's a filter.</small>
		</div>
	</v-detail>

	<v-detail
		label="Extras"
		class="section"
	>
		<div class="field">
			<div class="type-label">
				Clicking a row
			</div>
			<v-select
				v-model="rowClickWritable"
				:items="rowClickItems"
			/>
			<small class="type-note">Opens it is Directus's usual behaviour, and {{ keys.siblings }}-click selects a row instead (hold {{ keys.siblings }} to see which). Selects it makes a click select the row, and a double-click opens the item. A selected row's actions follow its name: <template v-if="ready && hierarchy === 'polyhierarchy'">add parents or children, or unlink it from the parent it's under, and </template><template v-else-if="ready">reparent it, and </template>open it when a click selects. Either way, the arrow keys move through the rows and Enter opens one, as {{ keys.inside }}+Enter does from the search.</small>
		</div>

		<div class="field">
			<div class="type-label">
				Most items loaded
			</div>
			<v-input
				v-model="maxItemsShown"
				type="number"
				:min="0"
				placeholder="No limit"
			/>
			<small class="type-note">This layout loads every item<template v-if="hierarchy === 'polyhierarchy'"> and link</template> at once, for its tree, search and filters. Past this many it shows a warning instead, rather than slow down the browser and the server; for a collection that big, Directus's own Table layout loads a page at a time. Empty for no limit. <a
				href="https://gla23.github.io/polyhierarchies/?page=too-big"
				target="_blank"
				rel="noopener"
			>Why there's a limit</a></small>
		</div>
	</v-detail>

	<a
		class="about"
		href="https://gla23.github.io/polyhierarchies/"
		target="_blank"
		rel="noopener"
	>
		<v-icon name="help_outline" small />
		What this layout can do, with examples
		<v-icon name="open_in_new" x-small />
	</a>
</template>

<style lang="scss" scoped>
    .v-checkbox {
	width: 100%;

	.spacer {
		flex-grow: 1;
	}
}

.drag-handle {
	--v-icon-color: var(--theme--foreground-subdued);

	cursor: ns-resize;

	&:hover {
		--v-icon-color: var(--theme--foreground);
	}
}

.v-notice {
	--v-notice-background-color: var(--theme--background-accent);
}

.setup {
	p + ol,
	ol + p,
	p + p {
		margin-top: 8px;
	}

	ol {
		padding-left: 20px;
	}

	.done {
		text-decoration: line-through;
		opacity: 0.6;
	}
}

.ends {
	display: flex;
	align-items: center;
	gap: 8px;

	.v-select {
		flex: 1;
		min-width: 0;
	}
}

.checkbox {
	margin-top: 12px;
}

/* Directus's collapsible headings. The options sit on a two-column grid that only spans its own
   fields, so a section spans it too, or each landed in one column on top of the next */
.section {
	grid-column: 1 / -1;
}

.section .field + .field {
	margin-top: 20px;
}

.reset-folds {
	margin-top: 8px;
}

.about {
	grid-column: 1 / -1;
	display: flex;
	align-items: center;
	gap: 6px;
	color: var(--theme--foreground-subdued);
	font-size: 13px;

	&:hover {
		color: var(--theme--primary);
	}
}

/* A note of its own per line, where a field has two */
small.type-note {
	display: block;
}

small.type-note + small.type-note {
	margin-top: 6px;
}

small.type-note a {
	text-decoration: underline;
}
</style>
