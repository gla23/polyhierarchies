<script setup lang="ts">
import type { Field } from '@directus/types';
// CORE CHANGES
// import { useSync } from '@directus/composables';
import { useSync } from '@directus/extensions-sdk';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFolds } from './folds';

interface Props {
	fields: string[];
	activeFields: Field[];
	tableSpacing: 'compact' | 'cozy' | 'comfortable';
	parentField: string | null;
	shiftedColumns: number;
	showGuides: boolean;
	openDepth: number | null;
	sortField: string;
	collection: string;
	fieldsInCollection: any;
}

const props = defineProps<Props>();

const emit = defineEmits([
	'update:tableSpacing',
	'update:parentField',
	'update:shiftedColumns',
	'update:showGuides',
	'update:openDepth',
	'update:activeFields',
	'update:fields',
]);

const { t } = useI18n();

const tableSpacingWritable = useSync(props, 'tableSpacing', emit);
const parentFieldWritable = useSync(props, 'parentField', emit);
const shiftedColumnsWritable = useSync(props, 'shiftedColumns', emit);
const showGuidesWritable = useSync(props, 'showGuides', emit);
const openDepthWritable = useSync(props, 'openDepth', emit);

// Unset (the placeholder) is everything open, so a view that's never been set stays as it was
const openDepthItems = [
	{ text: 'None', value: 0 },
	...[1, 2, 3, 4].map((depth) => ({ text: String(depth), value: depth })),
];

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
</script>

<template>
	<div class="field">
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

	<template v-if="sortField && parentFieldWritable">
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
				Indented columns
			</div>
			<v-input
				:model-value="shiftedColumnsWritable"
				type="number"
				:min="0"
				:max="8"
				@update:model-value="shiftedColumnsWritable = Math.max(0, Number($event) || 0)"
			/>
		</div>

		<div class="field">
			<div class="type-label">
				Levels open to start
			</div>
			<v-select
				v-model="openDepthWritable"
				:items="openDepthItems"
				show-deselect
				placeholder="All"
			/>
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
				Folding
			</div>
			<v-checkbox
				v-model="showGuidesWritable"
				block
				label="Lines down each open item"
			/>
			<small class="type-note">{{ keys.inside }}-click a chevron for everything inside it,
				{{ keys.siblings }}-click for it and its siblings.</small>
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
	ol + p {
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

.reset-folds {
	margin-top: 8px;
}
</style>
