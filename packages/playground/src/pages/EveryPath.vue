<script setup lang="ts">
import { createGraph } from '@polyhierarchies/core';
import { PathList } from '@polyhierarchies/ui';
import { computed, ref } from 'vue';
import { current } from '../store';

const examples = [
	{ dataset: 'medicine', node: 'viral-pneumonia' },
	{ dataset: 'tasks', node: 'fix-bike' },
	{ dataset: 'food', node: 'tomato' }
];

const datasetId = ref(examples[0]!.dataset);
const nodeId = ref(examples[0]!.node);
const graph = computed(() => createGraph(current[datasetId.value]!));
const nodes = computed(() =>
	[...graph.value.data.nodes].sort((a, b) => a.label.localeCompare(b.label))
);
const count = computed(() => graph.value.paths(nodeId.value, 500).paths.length);

function pickExample(example: (typeof examples)[number]) {
	datasetId.value = example.dataset;
	nodeId.value = example.node;
}
</script>

<template>
	<article class="page">
		<h1>Every path to a node</h1>
		<p class="lede">
			In a tree, where something is and how you got there are the same thing. In a polyhierarchy a
			node can be reached several ways, and listing them all turns out to be one of the most useful
			things a UI can show.
		</p>

		<section class="demo">
			<div class="examples">
				<button
					v-for="example in examples"
					:key="example.dataset"
					type="button"
					:class="{ active: datasetId === example.dataset && nodeId === example.node }"
					@click="pickExample(example)"
				>
					{{ graph.data.id === example.dataset ? graph.label(example.node) : example.node }}
					<span>in {{ current[example.dataset]!.name }}</span>
				</button>
				<select v-model="nodeId" aria-label="Any node in this dataset">
					<option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.label }}</option>
				</select>
			</div>
			<p class="count">
				{{ graph.label(nodeId) }} has {{ count }} {{ count === 1 ? 'path' : 'paths' }} from the top.
			</p>
			<PathList :graph="graph" :id="nodeId" @pick="nodeId = $event" />
		</section>

		<h2>Why it helps</h2>
		<ul>
			<li>
				<strong>It explains a classification.</strong> Viral pneumonia's seven routes are seven reasons
				it is what it is: infectious, respiratory, inflammatory. A breadcrumb shows one and hides the
				other six.
			</li>
			<li>
				<strong>It answers "is it a …?" and says why.</strong> Whether a viral pneumonia counts as an
				infectious disease is a question of whether any path runs between them. Clinical terminologies
				are queried exactly this way: SNOMED CT's expression constraint language has an operator for
				"this concept and everything below it", reached by any route.
			</li>
			<li>
				<strong>It shows the modelling.</strong> Two routes that differ by one step (through
				<em>Lower respiratory tract infection</em> or through <em>Viral respiratory infection</em>) are
				a decision someone made, visible only when both are listed.
			</li>
			<li>
				<strong>It's how things are inherited.</strong> Anything that flows down a hierarchy flows down
				every path: a file in two shared folders is visible through both, and a job under two projects
				can take its priority from either.
			</li>
			<li>
				<strong>It makes breadcrumbs honest.</strong> Show the route you came by, and offer the others
				as "also in", instead of pretending there's one.
			</li>
		</ul>

		<h2>Where it is here</h2>
		<p>
			Under every UI on the Explore page, the side panel lists the paths to the focus; click a step to
			move there. Miller columns are the same idea walked one path at a time: the last column offers the
			node's other parents, and picking one re-routes the columns through it.
		</p>

		<h2>Out in the world</h2>
		<ul>
			<li>
				<strong>SNOMED CT</strong> browsers list a concept's parents and children rather than one
				position in a tree:
				<a
					href="https://snomedbrowser.org/?perspective=full&conceptId1=75570004&edition=MAIN/2026-09-01&release=&languages=en"
					>SNOMED browser</a
				>
				and
				<a
					href="https://ontoserver.csiro.au/shrimp/?concept=75570004&version=http%3A%2F%2Fsnomed.info%2Fsct%2F32506021000036107%2Fversion%2F20260831&valueset=http%3A%2F%2Fsnomed.info%2Fsct%2F32506021000036107%3Ffhir_vs&fhir=https%3A%2F%2Ftx.ontoserver.csiro.au%2Ffhir&tour=true"
					>Shrimp</a
				>, both on Viral pneumonia.
			</li>
			<li>
				<strong>MeSH</strong>, the medical subject headings, gives a heading one
				<a href="https://hhs.github.io/meshrdf/tree-numbers">tree number</a> per place it sits,
				<em>Eye</em> under both body regions and sense organs, and its
				<a href="https://meshb.nlm.nih.gov/treeview">browser</a> lists every one: breadcrumbs with
				more than one trail.
			</li>
			<li>
				<strong>The Gene Ontology</strong>, a large real DAG, in
				<a href="https://www.ebi.ac.uk/QuickGO/">QuickGO</a>, whose ancestor chart draws every path
				up to the root at once (the Layered DAG's <em>Ancestors only</em> scope here), and
				<a href="https://www.ebi.ac.uk/ols4/">OLS</a>, whose tree repeats a term under each parent
				and marks it — the Outline's duplicates.
			</li>
			<li>
				<strong>Zotero</strong> keeps an item in several collections: select it and hold ⌥ or Ctrl, and
				every collection containing it lights up
				(<a href="https://www.zotero.org/support/kb/collections_containing_an_item">how</a>). Hold Alt
				in the Outline, Tree table or Miller columns here for the same.
			</li>
			<li>
				<strong>Wikipedia</strong> files an article in as many categories as apply, and categories sit
				in other categories, so an article is reachable from the top by many routes
				(<a href="https://en.wikipedia.org/wiki/Help:Category">how categories work</a>).
			</li>
			<li>
				<strong>Shops</strong> file a product in several categories and then pick one for the
				breadcrumb and URL
				(<a href="https://yoast.com/help/how-to-select-a-primary-category/">Yoast's primary category</a>)
				— one path shown, the rest as "also in". See <em>Primary parents?</em>.
			</li>
		</ul>

		<h2>The cost</h2>
		<p>
			Paths multiply: each node with two parents doubles the routes below it. The generated 2,000-node
			dataset has nodes with thousands, so every list here stops at a limit and says so. Routes round a
			cycle are left out — a loop isn't a way down from the top — which is also what keeps finding
			them fast.
		</p>
	</article>
</template>

<style scoped>
.page {
	max-width: 760px;
	margin: 0 auto;
	padding: 32px 24px 64px;
	line-height: 1.6;
}

h1 {
	margin: 0 0 8px;
	font-size: 26px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.lede {
	font-size: 16px;
	color: var(--theme--foreground-subdued);
}

h2 {
	margin: 32px 0 8px;
	font-size: 17px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

li + li {
	margin-top: 10px;
}

strong {
	color: var(--theme--foreground-accent);
	font-weight: 600;
}

a {
	color: var(--theme--primary);
}

.demo {
	margin: 24px 0;
	padding: 16px;
	background: var(--theme--background-subdued);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: 10px;
}

.examples {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-bottom: 12px;
}

.examples button {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	padding: 6px 12px;
	font: inherit;
	line-height: 1.3;
	color: var(--theme--foreground);
	background: var(--theme--background);
	border: var(--theme--border-width) solid var(--theme--border-color-accent);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.examples button span {
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.examples button.active {
	background: var(--theme--primary-background);
	border-color: var(--theme--primary);
}

.examples select {
	padding: 6px 10px;
	font: inherit;
	color: var(--theme--form--field--input--foreground);
	background: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.count {
	margin: 0 0 10px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}
</style>
