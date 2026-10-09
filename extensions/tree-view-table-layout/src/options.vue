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
	hierarchy: 'taxonomy' | 'polyhierarchy';
	parentField: string | null;
	junction: string | null;
	junctionParent: string | null;
	junctionChild: string | null;
	junctionSort: string | null;
	treeColumn: string;
	searchMode: 'routes' | 'inplace';
	filterMode: LayerMode;
	modeMenus: boolean;
	showGuides: boolean;
	openDepth: number | null;
	maxOpenDepth: number | null;
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
	'update:showGuides',
	'update:openDepth',
	'update:maxOpenDepth',
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
const searchModeItems = [
	{ text: 'Show the routes to the matches', value: 'routes' },
	{ text: 'Keep my folds, mark the matches', value: 'inplace' },
];
const modeItems = [
	{ text: 'Hide what doesn’t match', value: 'hide' },
	{ text: 'Show the routes to the matches', value: 'routes' },
	{ text: 'Keep my folds, mark the matches', value: 'inplace' },
	{ text: 'Off: set aside, not cleared', value: 'off' },
];
const showGuidesWritable = useSync(props, 'showGuides', emit);
const openDepthWritable = useSync(props, 'openDepth', emit);
const maxOpenDepthWritable = useSync(props, 'maxOpenDepth', emit);
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
	{ text: 'Taxonomy: one parent each', value: 'taxonomy' },
	{ text: 'Polyhierarchy: any number of parents', value: 'polyhierarchy' },
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
		: !!(props.sortField && props.parentField),
);
</script>

<template>
	<v-detail
		label="Hierarchy"
		class="section"
		:start-open="!ready"
	>
		<div class="field">
			<div class="type-label">
				Type
			</div>
			<v-select
				v-model="hierarchyWritable"
				:items="hierarchyItems"
			/>
		</div>

		<div
			v-if="hierarchy !== 'polyhierarchy'"
			class="field"
		>
			<div class="type-label">
				Parent (M2O)
			</div>

			<v-notice
				v-if="!sortField || !selfReferencingM2oFields?.length"
				type="info"
				class="setup"
			>
				<div>
					<p>This layout nests each item under its parent. It needs two fields, set up in this collection's data model settings:</p>
					<ol>
						<li :class="{ done: sortField }">
							A sort field: an integer field, chosen as the collection's sort field
						</li>
						<li :class="{ done: selfReferencingM2oFields?.length }">
							A parent field: a many-to-one field that relates to this same collection
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
				>The field that holds each item's parent. Choosing one can rewrite your items' sort values.</small>
			</template>
		</div>

		<template v-else>
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
						<p>A polyhierarchy keeps its links in a junction collection: one row per parent → child link, with two many-to-one fields that both point at this collection.</p>
						<p>Create one in the data model settings (a many-to-many from this collection to itself makes one), then choose it here.</p>
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

	<template v-if="ready">
		<v-detail
			label="Display"
			class="section"
			start-open
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

			<div class="field">
				<div class="type-label">
					Tree column
				</div>
				<v-select
					v-model="treeColumnWritable"
					:items="treeColumnItems"
				/>
				<small class="type-note">This column, and every column before it, moves right with each level, so the columns after it stay in line. Hints such as “12 below” appear in it.</small>
				<v-checkbox
					v-model="showGuidesWritable"
					block
					label="Lines down each open item"
					class="checkbox"
				/>
			</div>
		</v-detail>

		<v-detail
			label="Folding"
			class="section"
			start-open
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

		<v-detail
			label="Search and filters"
			class="section"
			start-open
		>
			<div class="field">
				<div class="type-label">
					Search
				</div>
				<v-select v-model="searchModeWritable" :items="searchModeItems" />
				<div class="type-label search-label">
					Filters
				</div>
				<v-select v-model="filterModeWritable" :items="modeItems" />
				<v-checkbox
					v-model="modeMenusWritable"
					block
					label="Filter menu in the top bar while filtering"
					class="checkbox"
				/>
				<small class="type-note">A search either opens every way to its matches, hiding the rest, or marks them where they are and keeps your folds; in both, Enter in the search goes to the next match. A filter can do either too, hide what doesn't match while keeping your folds, or be turned off without clearing it.</small>
			</div>
		</v-detail>

		<v-detail
			label="Clicking"
			class="section"
			start-open
		>
			<div class="field">
				<div class="type-label">
					Clicking a row
				</div>
				<v-select
					v-model="rowClickWritable"
					:items="rowClickItems"
				/>
				<small class="type-note">Opens it is Directus's usual behaviour, and {{ keys.siblings }}-click selects a row instead (hold {{ keys.siblings }} to see which). Selects it makes a click select the row, and a double-click opens the item. A selected row's actions follow its name: <template v-if="hierarchy === 'polyhierarchy'">add parents or children, or unlink it from the parent it's under</template><template v-else>reparent it</template>, and open it when a click selects. Either way, the arrow keys move through the rows and Enter opens one.</small>
			</div>
		</v-detail>
	</template>
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

.search-label {
	margin-top: 12px;
}

.reset-folds {
	margin-top: 8px;
}

/* A note of its own per line, where a field has two */
small.type-note {
	display: block;
}

small.type-note + small.type-note {
	margin-top: 6px;
}
</style>
