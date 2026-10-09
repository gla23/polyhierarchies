<script setup lang="ts">
import { CassetteButtons } from '@polyhierarchies/ui';
import { ref } from 'vue';
import Demo from '../components/Demo.vue';
import ExploreLink from '../components/ExploreLink.vue';

const repeat = ref<'once' | 'mirror'>('once');
</script>

<template>
	<article class="concept">
		<h1>Duplicates, mirrors and loops</h1>
		<p class="lede">
			A tree gives every node one place. Give a node several parents and a tree-shaped UI has to decide
			what to draw in each of them; give it a cycle and, left alone, it would draw forever.
		</p>

		<div class="demo-controls">
			<span>Other placements</span>
			<CassetteButtons
				v-model="repeat"
				label="Other placements"
				:options="[
					{ value: 'once', label: 'Terminal duplicates' },
					{ value: 'mirror', label: 'Mirrors' }
				]"
			/>
		</div>
		<Demo ui="tree-lab" data="medicine" focus="pneumonia" :options="{ repeat, openDepth: 8 }" :height="460">
			Pneumonia is under Disorder of lung and under Inflammatory disorder. As a duplicate, its second
			placement is one dashed line; as a mirror, its whole branch comes along.
		</Demo>

		<h2>The rule</h2>
		<p>
			Each place a node appears is a <strong>placement</strong>: the node reached by one particular
			route from a root. Pneumonia has two; in the Food dataset, Tomato has three. The trees here draw a node <strong>in full</strong> the
			first time a depth-first walk from the roots reaches it, and every other placement as a
			<strong>terminal duplicate</strong>: dashed, with no children of its own, saying where the full
			one is ("in Fruit"). Click one and the focus moves to the full placement.
		</p>
		<p>
			<strong>Mirrors</strong> draw it in full everywhere, so its children turn up under every
			parent, as Workflowy's mirrors do (⇄ marks one). Either way, a node that would appear inside its
			own route is a <strong>loop</strong>: drawn once more with a ↻ and no children, which is what
			stops a cycle being drawn forever.
		</p>

		<h2>How each UI does it</h2>
		<ul>
			<li>
				<ExploreLink :to="{ ui: 'tree-table', data: 'food', focus: 'tomato' }">Tree table</ExploreLink>:
				both rules, in the table the Directus layout draws.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'tree-lab', data: 'food', focus: 'tomato', options: { openDepth: 2 } }"
					>Tree lab</ExploreLink
				>: both rules, with the home hint on each duplicate and the parent count beside each node.
				Hover the count to light every placement.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'miller', data: 'food', focus: 'tomato' }">Miller columns</ExploreLink>:
				never a duplicate. A column holds every child of one parent; the last one names the parent this
				route came through and lists the others, to re-route through.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'plex', data: 'food', focus: 'tomato' }">Plex</ExploreLink>: one step
				out from the focus, so nothing is ever drawn twice.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'layered', data: 'food', focus: 'tomato' }">Layered DAG</ExploreLink>,
				<ExploreLink :to="{ ui: 'force', data: 'food', focus: 'tomato' }">Force graph</ExploreLink> and
				<ExploreLink :to="{ ui: 'network', data: 'food', focus: 'tomato' }">Network graph</ExploreLink>:
				every node once and every edge drawn, so several parents are just more lines into it.
			</li>
		</ul>

		<h2>Out in the world</h2>
		<ul>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="ontology-lookup-service">OLS</ExploreLink> repeats
				a term in full under every route to it: mitochondrial outer membrane turns up 18 times.
			</li>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="mesh-browser">MeSH</ExploreLink> mirrors: a
				heading's whole branch comes with it to every place, each place with its own tree number.
			</li>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="icd-11-browser">ICD-11</ExploreLink> gives each
				disease one home and greys it everywhere else, its code saying where home is: a terminal
				duplicate with an address.
			</li>
		</ul>

		<h2>The trade-off</h2>
		<p>
			Duplicates keep the tree the size of the graph, but every placement except one is a pointer to
			follow. Mirrors make every placement complete and multiply: unfolding everything in the 2,000-node
			cyclic dataset with mirrors stops at 3,000 rows. Which placement counts as first falls out of the
			order the data is in, the implicit primary parent that
			<ExploreLink :to="{ page: 'primary-parents' }">Primary parents?</ExploreLink> compares with a
			stored one.
		</p>
	</article>
</template>
