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
	searchMode: LayerMode;
	filterMode: LayerMode;
	modeMenus: boolean;
	showGuides: boolean;
	openDepth: number | null;
	maxOpenDepth: number | null;
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
const modeItems = [
	{ text: 'Hide what doesn’t match', value: 'hide' },
	{ text: 'Show the routes to the matches', value: 'routes' },
	{ text: 'Keep my folds, mark the matches', value: 'inplace' },
	{ text: 'Off: set aside, not cleared', value: 'off' },
];
const showGuidesWritable = useSync(props, 'showGuides', emit);
const openDepthWritable = useSync(props, 'openDepth', emit);
const maxOpenDepthWritable = useSync(props, 'maxOpenDepth', emit);
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
	<div class="field">
		<div class="type-label">
			Hierarchy
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
				<small class="type-note">One row per link. Order and editing work on these rows, not on the items.</small>
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
			<small class="type-note">Which field of a link is the parent. Swapping them shows everything a node belongs to instead of what it holds.</small>
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
				:items="junctionSortItems"
				show-deselect
				placeholder="As the links were made"
			/>
			<small class="type-note">An integer field on the links, so a node's place can differ under each parent. Without one, children can't be reordered.</small>
		</div>
	</template>

	<template v-if="ready">
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
			<small class="type-note">The column that indents with each level, and every column before it; the rest stay in line. It stays the same column when columns are reordered, and hints like “in Fruit” and “12 below” go in it.</small>
		</div>

		<div class="field">
			<div class="type-label">
				Levels open to start
			</div>
			<v-select
				v-model="openDepthWritable"
				:items="openDepthItems"
			/>
			<v-button
				class="reset-folds"
				small
				secondary
				@click="resetFolds"
			>
				Reset my folds
			</v-button>
			<div class="type-label opened-label">
				Levels opened at most
			</div>
			<v-select
				v-model="maxOpenDepthWritable"
				:items="maxOpenDepthItems"
			/>
			<small class="type-note">By Unfold all and by a search's routes, so a deep tree doesn't indent the other columns off screen. Opening one row or going to one match goes as deep as it needs; {{ keys.inside }}-click a chevron for everything inside.</small>
		</div>

		<div class="field">
			<div class="type-label">
				Filters
			</div>
			<v-select v-model="filterModeWritable" :items="modeItems" />
			<div class="type-label search-label">
				Search
			</div>
			<v-select v-model="searchModeWritable" :items="modeItems" />
			<v-checkbox
				v-model="modeMenusWritable"
				block
				label="Also as menus in the top bar"
				class="menus-toggle"
			/>
			<small class="type-note">Each has its own, so a filter can hide archived items while a search highlights on top. Hide: what doesn’t match isn’t there, nothing is highlighted, folds stay, and an ancestor stays dimmed only to hold a match’s place. Routes: every way to a match opens, the rest hides, and folds made meanwhile last only as long as the search. Keep my folds: the matches are marked where they are, and folded rows say how many they hold. Off sets one aside without clearing it. Enter in the search goes to the next match, opening the way to it. Rows can be dragged in every mode.</small>
		</div>

		<div class="field">
			<div class="type-label">
				Folding
			</div>
			<v-checkbox
				v-model="showGuidesWritable"
				block
				label="Lines down each open item"
			/>
			<small class="type-note">{{ keys.inside }}-click a chevron for everything inside it,
				{{ keys.siblings }}-click for it and its siblings.<template v-if="hierarchy === 'polyhierarchy'"> Hold {{ keys.siblings }} while dropping a dragged row to add a parent rather than move it.</template></small>
		</div>
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

.menus-toggle {
	margin-top: 12px;
}

.search-label {
	margin-top: 12px;
}

.reset-folds {
	margin-top: 8px;
}

.opened-label {
	margin-top: 16px;
}
</style>
