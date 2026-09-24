<script setup lang="ts">
import type { Column, FieldValue, Graph } from '@polyhierarchies/core';
import { computed, ref, watch } from 'vue';
import type { GraphEditor } from '../editing';
import NodeIcon from './NodeIcon.vue';
import NodeLabel from './NodeLabel.vue';

/** The standalone stand-in for Directus's item page. Read only without an editor. */
const props = defineProps<{ graph: Graph; editor?: GraphEditor }>();
const id = defineModel<string | null>('id', { default: null });

const dialog = ref<HTMLDialogElement>();
watch(
	id,
	(value) => {
		if (value && !dialog.value?.open) dialog.value?.showModal();
		if (!value && dialog.value?.open) dialog.value.close();
	},
	{ flush: 'post' }
);

// A node deleted from elsewhere closes its editor rather than erroring
const node = computed(() => props.graph.data.nodes.find((each) => each.id === id.value));
const columns = computed(() => props.graph.data.columns ?? []);

const others = computed(() =>
	props.graph.data.nodes
		.filter((each) => each.id !== id.value)
		.sort((a, b) => a.label.localeCompare(b.label))
);

const relations = computed(() => {
	const self = id.value!;
	const { graph, editor } = props;
	return [
		{
			title: 'Parents',
			ids: graph.parents(self),
			add: (other: string) => editor?.link(other, self),
			remove: (other: string) => editor?.unlink(other, self)
		},
		{
			title: 'Children',
			ids: graph.children(self),
			add: (other: string) => editor?.link(self, other),
			remove: (other: string) => editor?.unlink(self, other)
		},
		{
			title: 'Jumps',
			ids: graph.jumps(self),
			add: (other: string) => editor?.jump(self, other),
			remove: (other: string) => editor?.unjump(self, other)
		}
	];
});

function setField(column: Column, raw: string | boolean) {
	const value: FieldValue =
		column.type === 'boolean' ? Boolean(raw) : column.type === 'number' ? (raw === '' ? null : Number(raw)) : String(raw);
	props.editor?.update(id.value!, { fields: { ...node.value?.fields, [column.key]: value } });
}

const text = (event: Event) => (event.target as HTMLInputElement).value;

function remove() {
	if (!node.value || !confirm(`Delete ${node.value.label}?`)) return;
	props.editor?.remove(node.value.id);
	id.value = null;
}
</script>

<template>
	<dialog
		ref="dialog"
		class="node-editor"
		@close="id = null"
		@click="$event.target === dialog && (id = null)"
	>
		<form v-if="node" method="dialog" @submit.prevent="id = null">
			<header>
				<h2><NodeLabel :graph="graph" :id="node.id" /></h2>
				<span v-if="!editor" class="read-only">Read only</span>
			</header>

			<fieldset :disabled="!editor">
				<label>
					<span>Name</span>
					<input
						:value="node.label"
						@change="editor?.update(node.id, { label: text($event) || node.label })"
					/>
				</label>
				<div class="pair">
					<label>
						<span>Icon</span>
						<span class="with-preview">
							<NodeIcon v-if="node.icon" :name="node.icon" :style="{ color: node.colour }" />
							<input
								:value="node.icon ?? ''"
								placeholder="lucide:zap or home"
								@change="editor?.update(node.id, { icon: text($event) || undefined })"
							/>
						</span>
					</label>
					<label>
						<span>Colour</span>
						<span class="with-preview">
							<input
								type="color"
								class="swatch"
								:value="node.colour?.startsWith('#') ? node.colour : '#888888'"
								@change="editor?.update(node.id, { colour: text($event) })"
							/>
							<input
								:value="node.colour ?? ''"
								placeholder="any CSS colour"
								@change="editor?.update(node.id, { colour: text($event) || undefined })"
							/>
						</span>
					</label>
				</div>

				<label v-for="column in columns" :key="column.key" :class="{ inline: column.type === 'boolean' }">
					<span>{{ column.label }}</span>
					<input
						v-if="column.type === 'boolean'"
						type="checkbox"
						:checked="Boolean(node.fields?.[column.key])"
						@change="setField(column, ($event.target as HTMLInputElement).checked)"
					/>
					<input
						v-else
						:type="column.type === 'number' ? 'number' : 'text'"
						step="any"
						:value="node.fields?.[column.key] ?? ''"
						@change="setField(column, text($event))"
					/>
				</label>

				<section v-for="relation in relations" :key="relation.title" class="relation">
					<h3>{{ relation.title }}</h3>
					<div class="chips">
						<span v-for="other in relation.ids" :key="other" class="chip">
							<button type="button" class="open" @click="id = other">
								<NodeLabel :graph="graph" :id="other" />
							</button>
							<button
								v-if="editor"
								type="button"
								class="unlink"
								:aria-label="`Remove ${graph.label(other)}`"
								@click="relation.remove(other)"
							>
								×
							</button>
						</span>
						<select
							v-if="editor"
							:aria-label="`Add to ${relation.title.toLowerCase()}`"
							@change="
								relation.add(text($event));
								($event.target as HTMLSelectElement).value = '';
							"
						>
							<option value="">Add…</option>
							<option
								v-for="other in others.filter((each) => !relation.ids.includes(each.id))"
								:key="other.id"
								:value="other.id"
							>
								{{ other.label }}
							</option>
						</select>
					</div>
				</section>
			</fieldset>

			<footer>
				<button v-if="editor" type="button" class="danger" @click="remove">Delete</button>
				<button type="submit" class="done">Done</button>
			</footer>
		</form>
	</dialog>
</template>

<style scoped>
.node-editor {
	width: min(560px, calc(100vw - 32px));
	max-height: calc(100vh - 64px);
	padding: 0;
	color: var(--theme--foreground);
	background: var(--theme--background);
	border: var(--theme--border-width) solid var(--theme--border-color-accent);
	border-radius: 10px;
	box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.node-editor::backdrop {
	background: rgba(0, 0, 0, 0.45);
}

.node-editor[open] {
	animation: editor-in 180ms cubic-bezier(0.2, 0, 0, 1);
}

.node-editor[open]::backdrop {
	animation: backdrop-in 180ms ease-out;
}

@keyframes editor-in {
	from {
		opacity: 0;
		transform: translateY(10px) scale(0.98);
	}
}

@keyframes backdrop-in {
	from {
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.node-editor[open],
	.node-editor[open]::backdrop {
		animation: none;
	}
}

form {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px;
}

header {
	display: flex;
	align-items: center;
	gap: 12px;
}

h2 {
	margin: 0;
	font-size: 17px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.read-only {
	margin-left: auto;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

fieldset {
	display: flex;
	flex-direction: column;
	gap: 14px;
	margin: 0;
	padding: 0;
	border: none;
}

label {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

label.inline {
	flex-direction: row;
	align-items: center;
	gap: 10px;
}

label > span:first-child,
h3 {
	margin: 0;
	font-size: 12px;
	font-weight: 600;
	color: var(--theme--foreground-subdued);
}

.pair {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 12px;
}

.with-preview {
	display: flex;
	align-items: center;
	gap: 8px;
}

input:not([type='checkbox'], [type='color']),
select {
	flex: 1;
	min-width: 0;
	padding: 7px 10px;
	font: inherit;
	color: var(--theme--form--field--input--foreground);
	background: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

input:hover:not(:disabled),
select:hover:not(:disabled) {
	border-color: var(--theme--form--field--input--border-color-hover);
}

input[type='checkbox'] {
	width: 16px;
	height: 16px;
	accent-color: var(--theme--primary);
}

.swatch {
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
}

.relation {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
}

.chip {
	display: inline-flex;
	align-items: center;
	background: var(--theme--background-normal);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
}

.chip button {
	padding: 3px 8px;
	font: inherit;
	color: inherit;
	background: none;
	border: none;
	cursor: pointer;
}

.chip .unlink {
	padding-left: 2px;
	color: var(--theme--foreground-subdued);
}

.chip .unlink:hover {
	color: var(--theme--danger, #e35169);
}

.chips select {
	flex: 0 1 180px;
	padding: 3px 8px;
}

footer {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

footer button {
	padding: 7px 16px;
	font: inherit;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.done {
	color: var(--theme--foreground-accent);
	background: var(--theme--primary-background);
	border: var(--theme--border-width) solid var(--theme--primary);
}

.danger {
	margin-right: auto;
	color: var(--theme--danger, #e35169);
	background: none;
	border: var(--theme--border-width) solid currentColor;
}
</style>
