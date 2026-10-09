<script setup lang="ts">
import { createGraph, datasets, invert } from '@polyhierarchies/core';
import { CassetteButtons, invertedEditor, NodeEditor, PathList } from '@polyhierarchies/ui';
import { computed, provide, reactive, ref, watch, watchEffect, type Component } from 'vue';
import ConceptPage from './components/ConceptPage.vue';
import DockPanel from './components/DockPanel.vue';
import ExploreLink from './components/ExploreLink.vue';
import { flyInto, flyOutOf } from './dock';
import { navigateKey, playgroundHref } from './links';
import Concepts from './pages/Concepts.vue';
import { concepts } from './pages/concepts';
import Cycles from './pages/Cycles.vue';
import EveryPath from './pages/EveryPath.vue';
import Intro from './pages/Intro.vue';
import LookingUp from './pages/LookingUp.vue';
import Placements from './pages/Placements.vue';
import PrimaryParents from './pages/PrimaryParents.vue';
import PriorArt from './pages/PriorArt.vue';
import Searching from './pages/Searching.vue';
import Selection from './pages/Selection.vue';
import TooBig from './pages/TooBig.vue';
import WorkedOut from './pages/WorkedOut.vue';
import Siblings from './pages/Siblings.vue';
import './pages/reading.css';
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

const navPages = [
	{ value: 'intro', label: 'Intro' },
	{ value: 'explore', label: 'Explore' },
	{ value: 'prior-art', label: 'Prior art' },
	{ value: 'concepts', label: 'Concepts' }
] as const;
/** Every page but Explore, by its address; the concept pages sit under the Concepts tab */
const pageComponents: Record<string, Component> = {
	intro: Intro,
	'prior-art': PriorArt,
	concepts: Concepts,
	placements: Placements,
	'looking-up': LookingUp,
	siblings: Siblings,
	cycles: Cycles,
	searching: Searching,
	selection: Selection,
	'too-big': TooBig,
	'worked-out': WorkedOut,
	'every-path': EveryPath,
	'primary-parents': PrimaryParents
};
const isConcept = (value: string) => concepts.some((concept) => concept.id === value);
const conceptTitle = (id: string) => concepts.find((concept) => concept.id === id)?.title ?? id;

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

/** UIs that were renamed, so old links still land */
const renamedUis: Record<string, string> = { outline: 'tree-lab' };

const page = ref('intro');
/** Settings a page keeps in the address for itself, such as the node Every path opens on */
const pageQuery = ref<Record<string, string>>({});
const datasetId = ref(datasets[0]!.id);
const uiId = ref(uis[0]!.id);
/** index.html has already applied it, so the first paint is right */
const theme = ref(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
const otherTheme = computed(() => (theme.value === 'dark' ? 'light' : 'dark'));

/**
 * Parents below draws every UI upside down, as swapping a junction's two fields does in Directus.
 * Only the address remembers it: a passing view, so a link without it always opens the right way up.
 */
const direction = ref<'down' | 'up'>('down');

const dataset = computed(() => current[datasetId.value] ?? current[datasets[0]!.id]!);
const graph = computed(() =>
	createGraph(direction.value === 'up' ? invert(dataset.value) : dataset.value)
);
const ui = computed(() => uis.find((entry) => entry.id === uiId.value) ?? uis[0]!);

const inDataset = (id: string | null) => dataset.value.nodes.some((node) => node.id === id);
const focus = ref<string | null>(null);
// A link can set the dataset and the focus together, so only a focus the new dataset lacks moves
watch(datasetId, () => {
	if (!inDataset(focus.value)) focus.value = dataset.value.start ?? null;
});
const focusNode = computed(() => dataset.value.nodes.find((node) => node.id === focus.value));

const mode = ref<'view' | 'edit'>(stored('mode', 'view'));
watch(mode, (value) => store('mode', value));
const editingId = ref<string | null>(null);
const editor = computed(() => {
	if (mode.value !== 'edit') return undefined;
	const plain = editorFor(datasetId.value, (id) => (editingId.value = id));
	return direction.value === 'up' ? invertedEditor(plain) : plain;
});

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
function setOption(option: OptionDef, raw: string, uiKey = ui.value.id) {
	const value = option.type === 'number' ? Number(raw) : raw;
	options[uiKey] = { ...options[uiKey], [option.key]: value };
	store('options', options);
}
/** A UI's options under their headings, in the order the headings first come; a short list needs none */
const optionGroups = computed(() => {
	const groups: { name: string; options: OptionDef[] }[] = [];
	for (const option of ui.value.options) {
		const name = option.group ?? '';
		const group = groups.find((each) => each.name === name);
		if (group) group.options.push(option);
		else groups.push({ name, options: [option] });
	}
	return groups;
});
const optionHeadings = computed(() => optionGroups.value.length > 1 && ui.value.options.length > 3);
function resetOptions() {
	delete options[ui.value.id];
	store('options', options);
}

/** Everything an address can say, applied on load, on Back and Forward, and by links in the pages */
function applyQuery(query: URLSearchParams) {
	const asked = query.get('page');
	// A bare address is the intro; one with Explore's settings but no page is Explore, as it always was
	page.value = asked && pageComponents[asked] ? asked : [...query.keys()].length ? 'explore' : 'intro';
	const data = query.get('data');
	if (data && current[data]) datasetId.value = data;
	const askedUi = query.get('ui');
	const entry = askedUi ? uis.find((each) => each.id === (renamedUis[askedUi] ?? askedUi)) : undefined;
	if (entry) uiId.value = entry.id;
	const node = query.get('focus');
	if (node && inDataset(node)) focus.value = node;
	else if (!inDataset(focus.value)) focus.value = dataset.value.start ?? null;
	if (query.has('mode')) mode.value = query.get('mode') === 'edit' ? 'edit' : 'view';
	direction.value = query.get('dir') === 'up' ? 'up' : 'down';
	// Options from a link win over remembered ones, and are remembered in turn
	for (const option of entry?.options ?? [])
		if (query.has(option.key)) setOption(option, query.get(option.key)!, entry!.id);
	const known = new Set(['page', 'data', 'ui', 'focus', 'mode', 'dir', ...(entry ?? ui.value).options.map((option) => option.key)]);
	pageQuery.value = Object.fromEntries([...query].filter(([key]) => !known.has(key)));
}
applyQuery(new URLSearchParams(location.search));
addEventListener('popstate', () => applyQuery(new URLSearchParams(location.search)));

/**
 * Explore's side panels, each open, closed (it opens again when there's something new for it to
 * explain: another UI, other data) or hidden (it stays away). Each keeps its own width.
 */
type PanelId = 'ui' | 'options' | 'data';
interface PanelState {
	open: boolean;
	reopen: boolean;
	width: number;
}
// In the rail top to bottom, and the panels left to right
const dockEntries = [
	{ id: 'ui', label: 'UI', reopensFor: 'another UI' },
	{ id: 'data', label: 'Data', reopensFor: 'other data' },
	{ id: 'options', label: 'Options', reopensFor: 'another UI' }
] as const;
const panelWidths: Record<PanelId, number> = { ui: 300, options: 280, data: 280 };
/**
 * A first visit starts with every panel shut, so the UI is all there is to look at. UI and Data
 * open by themselves once you pick another UI or dataset; Options waits to be asked for.
 */
const firstVisit: Record<PanelId, Pick<PanelState, 'open' | 'reopen'>> = {
	ui: { open: false, reopen: true },
	data: { open: false, reopen: true },
	options: { open: false, reopen: false }
};
const savedPanels = stored<Partial<Record<PanelId, Partial<PanelState>>>>('panels', {});
const panels = reactive(
	Object.fromEntries(
		dockEntries.map(({ id }) => [id, { ...firstVisit[id], width: panelWidths[id], ...savedPanels[id] }])
	) as Record<PanelId, PanelState>
);
watch(panels, (value) => store('panels', value), { deep: true });
const panelTitles = computed<Record<PanelId, string>>(() => ({ ui: ui.value.name, options: 'Options', data: dataset.value.name }));
/** Where each panel goes when it closes; not reactive, only measured */
const railButtons: Partial<Record<PanelId, HTMLElement>> = {};
function closePanel(id: PanelId, reopen: boolean) {
	panels[id].open = false;
	panels[id].reopen = reopen;
}
function railTitle(entry: (typeof dockEntries)[number]) {
	const { open, reopen } = panels[entry.id];
	if (open) return `Close ${entry.label}`;
	return reopen
		? `Show ${entry.label}. Closed, it opens again when you pick ${entry.reopensFor}`
		: `Show ${entry.label}. Hidden, it stays away until you open it here`;
}
/**
 * Something new to explain: a closed panel opens again; a hidden one stays away. Only for a pick
 * made in Explore: a link arriving from another page sets the UI too, and shouldn't greet you with
 * panels.
 */
function reopen(ids: readonly PanelId[], now: string, before: string) {
	if (now !== 'explore' || before !== 'explore') return;
	for (const id of ids) if (!panels[id].open && panels[id].reopen) panels[id].open = true;
}
watch([uiId, page], ([, now], [, before]) => reopen(['ui', 'options'], now, before));
watch([datasetId, page], ([, now], [, before]) => reopen(['data'], now, before));
provide(navigateKey, (href) => {
	history.pushState(null, '', href);
	applyQuery(new URL(href, location.href).searchParams);
});

// In the address bar, so any combination can be shared or reloaded
watchEffect(() => {
	const changed = ui.value.options.filter((option) => optionValues.value[option.key] !== option.default);
	// The other pages only need their own settings; Explore's state waits in memory meanwhile
	const href =
		page.value === 'explore'
			? playgroundHref({
					data: datasetId.value,
					ui: uiId.value,
					focus: focus.value,
					mode: mode.value,
					dir: direction.value,
					options: Object.fromEntries(changed.map((option) => [option.key, optionValues.value[option.key]!]))
				})
			: playgroundHref({ page: page.value, query: pageQuery.value });
	// Prior art keeps the entry a link pointed at
	history.replaceState(null, '', page.value === 'prior-art' ? href + location.hash : href);
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
					v-for="entry in navPages"
					:key="entry.value"
					type="button"
					class="nav-link"
					:class="{ active: page === entry.value || (entry.value === 'concepts' && isConcept(page)) }"
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
				<!-- The two long ones on lines of their own, so neither wraps beside the other -->
				<span class="line-break" />
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
				<div class="control">
					<span>Direction</span>
					<CassetteButtons
						v-model="direction"
						label="Direction"
						:options="[
							{ value: 'down', label: 'Children below', title: 'The hierarchy as stored' },
							{
								value: 'up',
								label: 'Parents below',
								title: 'Every UI upside down: a node\'s parents drawn where its children were'
							}
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

		<!-- Keyed, so each page starts scrolled to the top -->
		<div v-if="page !== 'explore'" :key="page" class="reading">
			<ConceptPage v-if="isConcept(page)" :id="page">
				<component :is="pageComponents[page]" v-bind="page === 'every-path' ? { query: pageQuery } : {}" />
			</ConceptPage>
			<component :is="pageComponents[page]" v-else />
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

			<!-- Straight in the row with the stage, which takes whatever they leave: a wrapper's own width
			     was worked out from its panels' unwrapped text in Gecko, and left a gap -->
			<Transition
				v-for="entry in dockEntries"
				:key="entry.id"
				:css="false"
				@enter="(el, done) => flyOutOf(el, railButtons[entry.id], done)"
				@leave="(el, done) => flyInto(el, railButtons[entry.id], done)"
			>
				<DockPanel
					v-if="panels[entry.id].open"
					:title="panelTitles[entry.id]"
					:width="panels[entry.id].width"
					:reopens-for="entry.reopensFor"
					@close="closePanel(entry.id, $event)"
					@resize="panels[entry.id].width = $event"
				>
					<template v-if="entry.id === 'ui'">
						<p v-for="(paragraph, index) in ui.about" :key="index">{{ paragraph }}</p>
						<p v-if="ui.concepts" class="related">
							Concepts:
							<template v-for="(id, index) in ui.concepts" :key="id">
								<ExploreLink :to="{ page: id }">{{ conceptTitle(id) }}</ExploreLink
								><template v-if="index < ui.concepts.length - 1"> · </template>
							</template>
						</p>
						<p v-if="editor" class="editing"><strong>Editing:</strong> {{ ui.editing }}</p>
					</template>

					<template v-else-if="entry.id === 'options'">
						<div class="options">
							<template v-for="group in optionGroups" :key="group.name">
								<h3 v-if="optionHeadings" class="option-group">{{ group.name }}</h3>
								<div v-for="option in group.options" :key="option.key" class="option">
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
							</template>
							<button v-if="options[ui.id]" type="button" class="reset" @click="resetOptions">
								Reset options
							</button>
						</div>
					</template>

					<template v-else>
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
					</template>
				</DockPanel>
			</Transition>

			<nav class="rail" aria-label="Panels">
				<button
					v-for="entry in dockEntries"
					:key="entry.id"
					:ref="(el) => el && (railButtons[entry.id] = el as HTMLElement)"
					type="button"
					class="rail-button"
					:class="{ open: panels[entry.id].open, hidden: !panels[entry.id].open && !panels[entry.id].reopen }"
					:aria-pressed="panels[entry.id].open"
					:title="railTitle(entry)"
					@click="panels[entry.id].open = !panels[entry.id].open"
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<template v-if="entry.id === 'ui'">
							<circle cx="12" cy="12" r="9" />
							<path d="M12 11v5M12 8h.01" />
						</template>
						<template v-else-if="entry.id === 'options'">
							<path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
							<circle cx="15" cy="7" r="2" />
							<circle cx="9" cy="17" r="2" />
						</template>
						<template v-else>
							<ellipse cx="12" cy="6" rx="7" ry="3" />
							<path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" />
						</template>
					</svg>
					<span>{{ entry.label }}</span>
				</button>
			</nav>
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
	align-items: center;
	gap: 8px 24px;
	padding: 8px 24px;
}

/* Labels beside their buttons rather than above, a line each saved */
.control {
	display: flex;
	align-items: center;
	gap: 8px;
}

.line-break {
	flex-basis: 100%;
	height: 0;
}

.reset {
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

.option-group {
	margin: 6px 0 -6px;
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--theme--foreground-subdued);
}

.option-group:first-child {
	margin-top: 0;
}

.related {
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}

.related a {
	color: var(--theme--primary);
}

.editing {
	padding: 8px 10px;
	font-size: 13px;
	background: var(--theme--primary-background);
	border-radius: var(--theme--border-radius);
}

/* One width, so the UI and Data buttons start in line */
.control > span {
	min-width: 32px;
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
	display: flex;
	flex: 1;
	min-height: 0;
}

.stage {
	flex: 1 1 0;
	min-width: 280px;
	overflow: auto;
	overscroll-behavior: contain;
	padding: 16px;
}

.rail {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 8px 4px;
	border-left: var(--theme--border-width) solid var(--theme--border-color);
	background: var(--theme--background-subdued);
}

.rail-button {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	width: 52px;
	padding: 6px 0 4px;
	font: inherit;
	font-size: 11px;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.rail-button:hover {
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
}

.rail-button.open {
	color: var(--theme--primary);
	background: var(--theme--primary-background);
}

/* Hidden: still there to open, but quieter than one that will open again by itself */
.rail-button.hidden {
	opacity: 0.55;
}

.rail-button svg {
	width: 20px;
	height: 20px;
	fill: none;
	stroke: currentColor;
	stroke-width: 1.75;
	stroke-linecap: round;
	stroke-linejoin: round;
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

p + h2,
dl + h2 {
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
		flex-direction: column;
		overflow-y: auto;
	}

	.stage {
		flex: none;
		min-height: 60vh;
	}

	.rail {
		flex-direction: row;
		order: 1;
		border-left: none;
		border-top: var(--theme--border-width) solid var(--theme--border-color);
	}
}
</style>
