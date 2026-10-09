<script setup lang="ts">
import Demo from '../components/Demo.vue';
import ExploreLink from '../components/ExploreLink.vue';
</script>

<template>
	<article class="concept">
		<h1>Cycles</h1>
		<p class="lede">
			Follow "becomes food for" long enough and you come back to where you started. A cycle is data,
			not an error, and every UI here has to cope with one, each in its own way.
		</p>

		<Demo ui="tree-lab" data="food-web" focus="grass" :options="{ openDepth: 6 }" :height="420">
			Grass → Rabbit → Fox → Decomposers → Soil → Grass. The ↻ marks where the loop closes.
		</Demo>

		<h2>Where a cycle closes</h2>
		<p>
			A cycle has no top, so "where it closes" depends on where you came in. Walking from the roots,
			the edge that leads back to a node already on the route is the one that closes it: Soil → Grass
			here. Chicken → Egg → Chicken has no root at all, so the walk picks the chicken as a way in.
			Which edge counts as the closing one is a choice made by the walk, not a fact about the data.
		</p>

		<h2>How each UI does it</h2>
		<ul>
			<li>
				<ExploreLink :to="{ ui: 'tree-lab', data: 'food-web', focus: 'grass', options: { openDepth: 6 } }"
					>Tree lab</ExploreLink
				>
				and
				<ExploreLink :to="{ ui: 'tree-table', data: 'food-web', focus: 'grass' }">Tree table</ExploreLink>:
				the node that would repeat inside its own route is drawn once more, with a ↻ and no children.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'force', data: 'food-web', focus: 'grass' }">Force graph</ExploreLink>:
				the closing edge is drawn in the warning colour; otherwise a cycle is just a ring of lines.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'layered', data: 'food-web', focus: 'grass' }">Layered DAG</ExploreLink>:
				layers need a top, so the closing edges are set aside and drawn looping round the right-hand
				side in the warning colour.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'miller', data: 'food-web', focus: 'grass' }">Miller columns</ExploreLink>:
				nothing special at all. Each column is just one node's children, so you can keep going round.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'plex', data: 'food-web', focus: 'grass' }">Plex</ExploreLink>: one step
				out, so a cycle only shows as a node being both above and below.
			</li>
		</ul>

		<h2>Out in the world</h2>
		<ul>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="wikipedia-categories">Wikipedia</ExploreLink>'s
				categories form a graph with cycles in it: follow parent categories far enough and some lead
				back to where they started.
			</li>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="graphviz-online">Graphviz</ExploreLink> turns one
				edge round to lay the rest out in layers, then draws it pointing back up.
			</li>
		</ul>

		<h2>The trade-off</h2>
		<p>
			Refusing cycles keeps every view simple and every node a clear top; allowing them keeps the data
			true. A taxonomy usually refuses them, since a node in a loop with no other parent can't be
			reached from any root; a polyhierarchy of how things relate often can't avoid them.
		</p>
	</article>
</template>
