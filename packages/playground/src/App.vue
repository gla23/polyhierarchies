<script setup lang="ts">
import { createGraph, datasets } from '@polyhierarchies/core';
import { CassetteButtons, NodeEditor, PathList } from '@polyhierarchies/ui';
import { computed, reactive, ref, watch, watchEffect } from 'vue';
import EveryPath from './pages/EveryPath.vue';
import PrimaryParents from './pages/PrimaryParents.vue';
import { current, editorFor, isEdited, reset } from './store';
import { uis, type OptionDef } from './uis';

function stored<T>(key: string, fallback: T): T {
	try {
		const json = localStorage.getItem(`polyhierarchies:${key}`);
		return json ? JSON.parse(json) : fallback;
	} catch {
		return fallback;
	}
}
function store(key: string, value: unknown) {
	try {
		localStorage.setItem(`polyhierarchies:${key}`, JSON.stringify(value));
	} catch {
		// Refused storage only costs remembering it next visit
	}
}

const pages = [
	{ value: 'explore', label: 'Explore' },
	{ value: 'every-path', label: 'Every path' },
	{ value: 'primary-parents', label: 'Primary parents?' }
] as const;
type Page = (typeof pages)[number]['value'];

/** Short enough to sit in a row of cassette keys; the full name is in the key's title */
const shortNames: Record<string, string> = {
	animals: 'Plain tree',
	tasks: 'Tasks',
	food: 'Food',
	'challenges-for-kids': 'TheBrain map',
	medicine: 'Medicine',
	'food-web': 'Cyclic',
	'generated-300': '300 nodes',
	'generated-2000-cyclic': '2,000 cyclic'
};

const params = new URLSearchParams(location.search);
const page = ref<Page>(pages.find((entry) => entry.value === params.get('page'))?.value ?? 'explore');
const datasetId = ref(params.get('data') ?? datasets[0]!.id);
const uiId = ref(params.get('ui') ?? uis[0]!.id);
/** index.html has already applied it, so the first paint is right */
const theme = ref(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const otherTheme = computed(() => (theme.value === 'dark' ? 'light' : 'dark'));

const dataset = computed(() => current[datasetId.value] ?? current[datasets[0]!.id]!);
const graph = computed(() => createGraph(dataset.value));
const ui = computed(() => uis.find((entry) => entry.id === uiId.value) ?? uis[0]!);

const focus = ref<string | null>(params.get('focus') ?? dataset.value.start ?? null);
watch(datasetId, () => (focus.value = dataset.value.start ?? null));
const focusNode = computed(() => dataset.value.nodes.find((node) => node.id === focus.value));

const mode = ref<'view' | 'edit'>(stored('mode', 'view'));
watch(mode, (value) => store('mode', value));
const editingId = ref<string | null>(null);
const editor = computed(() =>
	mode.value === 'edit' ? editorFor(datasetId.value, (id) => (editingId.value = id)) : undefined
);

const options = reactive<Record<string, Record<string, number | string>>>(stored('options', {}));
const optionValues = computed(() => ({
	...Object.fromEntries(ui.value.options.map((option) => [option.key, option.default])),
	...options[ui.value.id]
}));
/** So a UI's own controls for an option (a v-model on it) change it here too */
const optionListeners = computed(() =>
	Object.fromEntries(
		ui.value.options.map((option) => [
			`onUpdate:${option.key}`,
			(value: number | string) => setOption(option, String(value))
		])
	)
);
function setOption(option: OptionDef, raw: string) {
	const value = option.type === 'number' ? Number(raw) : raw;
	options[ui.value.id] = { ...options[ui.value.id], [option.key]: value };
	store('options', options);
}
function resetOptions() {
	delete options[ui.value.id];
	store('options', options);
}

// In the address bar, so any combination can be shared or reloaded
watchEffect(() => {
	const query = new URLSearchParams(page.value === 'explore' ? {} : { page: page.value });
	query.set('data', datasetId.value);
	query.set('ui', uiId.value);
	if (focus.value) query.set('focus', focus.value);
	history.replaceState(null, '', `?${query}`);
});

watch(theme, (value) => {
	document.documentElement.dataset.theme = value;
	try {
		localStorage.setItem('theme', value);
	} catch {
		// Private windows can refuse storage; the toggle still works for this visit
	}
});

const stats = computed(() => {
	const { stats } = graph.value;
	return [
		['Nodes', stats.nodes],
		['Parent → child edges', stats.edges],
		['Jumps', stats.jumps],
		['Roots', stats.roots],
		['Nodes with several parents', stats.multiParent],
		['Most parents', stats.mostParents],
		['Edges closing a cycle', stats.cycles]
	] as const;
});
</script>

<template>
	<div class="playground">
		<header>
			<nav>
				<h1>Polyhierarchies</h1>
				<button
					v-for="entry in pages"
					:key="entry.value"
					type="button"
					class="nav-link"
					:class="{ active: page === entry.value }"
					:aria-current="page === entry.value ? 'page' : undefined"
					@click="page = entry.value"
				>
					{{ entry.label }}
				</button>
				<button
					type="button"
					class="theme-toggle"
					:title="`Switch to the ${otherTheme} theme`"
					:aria-label="`Switch to the ${otherTheme} theme`"
					@click="theme = otherTheme"
				>
					<svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
						<circle cx="12" cy="12" r="4" />
						<path
							d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
						/>
					</svg>
					<svg v-else viewBox="0 0 24 24" aria-hidden="true">
						<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
					</svg>
				</button>
			</nav>
			<div v-if="page === 'explore'" class="controls">
				<div class="control">
					<span>UI</span>
					<CassetteButtons
						v-model="uiId"
						label="UI"
						:options="uis.map((entry) => ({ value: entry.id, label: entry.name }))"
					/>
				</div>
				<div class="control">
					<span>Data</span>
					<CassetteButtons
						v-model="datasetId"
						label="Dataset"
						:options="
							datasets.map((data) => ({
								value: data.id,
								label: shortNames[data.id] ?? data.name,
								title: data.name
							}))
						"
					/>
				</div>
				<!-- Mode and reset are about the data, not the view: their own line -->
				<span class="line-break" />
				<div class="control">
					<span>Mode</span>
					<CassetteButtons
						v-model="mode"
						label="Mode"
						:options="[
							{ value: 'view', label: 'Read only' },
							{ value: 'edit', label: 'Editable' }
						]"
					/>
				</div>
				<button
					v-if="isEdited(datasetId)"
					type="button"
					class="reset"
					:title="`Throw away every edit to ${dataset.name}`"
					@click="reset(datasetId)"
				>
					Reset data
				</button>
			</div>
		</header>

		<div v-if="page === 'primary-parents'" class="reading">
			<PrimaryParents />
		</div>
		<div v-else-if="page === 'every-path'" class="reading">
			<EveryPath />
		</div>

		<main v-else>
			<section class="stage">
				<!-- Keyed on both, so each pairing starts fresh rather than inheriting another's state -->
				<Transition name="stage" mode="out-in">
					<component
						:is="ui.component"
						:key="`${ui.id}:${dataset.id}`"
						v-model:focus="focus"
						v-bind="{ ...optionValues, ...optionListeners }"
						:graph="graph"
						:editor="editor"
					/>
				</Transition>
			</section>

			<aside>
				<h2>{{ ui.name }}</h2>
				<p v-for="(paragraph, index) in ui.about" :key="index">{{ paragraph }}</p>
				<p v-if="editor" class="editing"><strong>Editing:</strong> {{ ui.editing }}</p>

				<h2>Options</h2>
				<div class="options">
					<div v-for="option in ui.options" :key="option.key" class="option">
						<label :for="`option-${option.key}`">{{ option.label }}</label>
						<select
							v-if="option.type === 'choice'"
							:id="`option-${option.key}`"
							:value="optionValues[option.key]"
							@change="setOption(option, ($event.target as HTMLSelectElement).value)"
						>
							<option v-for="choice in option.choices" :key="choice.value" :value="choice.value">
								{{ choice.label }}
							</option>
						</select>
						<input
							v-else
							:id="`option-${option.key}`"
							type="number"
							:min="option.min"
							:max="option.max"
							:value="optionValues[option.key]"
							@input="setOption(option, ($event.target as HTMLInputElement).value)"
						/>
						<p>{{ option.about }}</p>
					</div>
					<button v-if="options[ui.id]" type="button" class="reset" @click="resetOptions">
						Reset options
					</button>
				</div>

				<h2>{{ dataset.name }}</h2>
				<p>{{ dataset.description }}</p>
				<dl>
					<template v-for="[term, value] in stats" :key="term">
						<dt>{{ term }}</dt>
						<dd>{{ value.toLocaleString('en-GB') }}</dd>
					</template>
				</dl>
				<template v-if="focusNode">
					<h2>Every path to {{ focusNode.label }}</h2>
					<PathList :graph="graph" :id="focusNode.id" :limit="12" @pick="focus = $event" />
				</template>
			</aside>
		</main>

		<NodeEditor v-model:id="editingId" :graph="graph" :editor="editor" />
	</div>
</template>

<style>
body {
	margin: 0;
	font-family: var(--theme--fonts--sans--font-family);
	font-size: 14px;
	color: var(--theme--foreground);
	background: var(--theme--background);
}
</style>

<style scoped>
.playground {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

header {
	border-bottom: var(--theme--border-width) solid var(--theme--border-color);
	background: var(--theme--background-subdued);
}

nav {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 0 16px 0 24px;
	border-bottom: var(--theme--border-width) solid var(--theme--border-color);
}

h1 {
	margin: 0 20px 0 0;
	white-space: nowrap;
	font-size: 16px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.nav-link {
	padding: 14px 10px 12px;
	font: inherit;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	border-bottom: 2px solid transparent;
	cursor: pointer;
}

.nav-link:hover {
	color: var(--theme--foreground);
}

.nav-link.active {
	color: var(--theme--foreground-accent);
	border-bottom-color: var(--theme--primary);
}

.theme-toggle {
	display: flex;
	margin-left: auto;
	padding: 6px;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.theme-toggle:hover {
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
}

.theme-toggle svg {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
}

.controls {
	display: flex;
	flex-wrap: wrap;
	gap: 12px 24px;
	padding: 12px 24px;
}

.control {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.controls {
	align-items: flex-end;
}

.line-break {
	flex-basis: 100%;
	height: 0;
}

.reset {
	margin-bottom: 4px;
	padding: 6px 12px;
	font: inherit;
	color: var(--theme--foreground-subdued);
	background: none;
	border: var(--theme--border-width) solid var(--theme--border-color-accent);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.reset:hover {
	color: var(--theme--danger);
	border-color: currentColor;
}

.options {
	display: flex;
	flex-direction: column;
	gap: 14px;
	margin-bottom: 24px;
}

.option {
	display: grid;
	grid-template-columns: 1fr 120px;
	align-items: center;
	gap: 4px 12px;
}

.option label {
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.option select,
.option input {
	padding: 4px 8px;
	font: inherit;
	color: var(--theme--form--field--input--foreground);
	background: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.option p {
	grid-column: 1 / -1;
	margin: 0;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.options .reset {
	align-self: flex-start;
}

.editing {
	padding: 8px 10px;
	font-size: 13px;
	background: var(--theme--primary-background);
	border-radius: var(--theme--border-radius);
}

.control > span {
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.stage-enter-active,
.stage-leave-active {
	transition:
		opacity 140ms ease-out,
		transform 140ms ease-out;
}

.stage-enter-from {
	opacity: 0;
	transform: translateY(6px);
}

.stage-leave-to {
	opacity: 0;
}

.reading {
	flex: 1;
	overflow-y: auto;
	overscroll-behavior: contain;
}

main {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 320px;
	flex: 1;
	min-height: 0;
}

.stage {
	overflow: auto;
	overscroll-behavior: contain;
	padding: 16px;
}

aside {
	overflow-y: auto;
	padding: 16px 20px;
	line-height: 1.5;
	border-left: var(--theme--border-width) solid var(--theme--border-color);
	background: var(--theme--background-subdued);
}

h2 {
	margin: 0 0 8px;
	font-size: 15px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

p {
	margin: 0 0 12px;
}

p + h2 {
	margin-top: 24px;
}

dl {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 4px 12px;
	margin: 0 0 12px;
	font-size: 13px;
}

dt {
	color: var(--theme--foreground-subdued);
}

dd {
	margin: 0;
	text-align: right;
	font-variant-numeric: tabular-nums;
}

.focus {
	color: var(--theme--foreground-subdued);
}

@media (max-width: 800px) {
	main {
		grid-template-columns: 1fr;
		grid-template-rows: minmax(60vh, 1fr) auto;
	}

	aside {
		border-left: none;
		border-top: var(--theme--border-width) solid var(--theme--border-color);
	}
}
</style>
