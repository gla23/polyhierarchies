<script setup lang="ts">
import Demo from '../components/Demo.vue';
import ExploreLink from '../components/ExploreLink.vue';
</script>

<template>
	<article class="concept">
		<h1>Looking up</h1>
		<p class="lede">
			Most views answer "what's inside this?". With several parents the other question matters as
			much: what does this belong to? In a tree the answer is one line of breadcrumbs; here it is a
			tree of its own.
		</p>

		<Demo
			ui="tree-lab"
			data="food"
			focus="tomato"
			dir="up"
			:options="{ start: 'focus', openDepth: 3 }"
			:height="260"
		>
			Food upside down, starting from Tomato: its three parents beneath it, and Food beneath each.
		</Demo>

		<h2>Turning the graph over</h2>
		<p>
			Explore's <strong>Direction</strong> control has a second setting, <strong>Parents below</strong>,
			that reverses every edge before any UI sees the graph. Nothing about the UIs changes, so each one
			shows the other half of the picture: the roots are now the old leaves, a node's parents are drawn
			where its children were, and its old children are where its parents were. Edits made upside down
			are stored the right way up.
		</p>
		<p>
			Swapping the parent and child fields of a links collection in the Directus layout does exactly
			the same, which is why the swap is a button rather than a mistake to avoid.
		</p>

		<h2>How each UI does it</h2>
		<ul>
			<li>
				<ExploreLink
					:to="{ ui: 'tree-lab', data: 'food', focus: 'tomato', dir: 'up', options: { start: 'focus', openDepth: 3 } }"
					>Tree lab</ExploreLink
				>, upside down and starting from the focus: everything a node belongs to, as an indented tree.
				Shared ancestors turn up once per route, as duplicates after the first.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'layered', data: 'medicine', focus: 'viral-pneumonia', options: { scope: 'ancestors' } }"
					>Layered DAG, ancestors only</ExploreLink
				>: every route to the top in one picture, each ancestor drawn once with several lines into it.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'miller', data: 'food', focus: 'tomato', dir: 'up' }"
					>Miller columns, upside down</ExploreLink
				>: each column is the parents of the one before, so you walk up instead of down.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'plex', data: 'medicine', focus: 'viral-pneumonia' }">Plex</ExploreLink>:
				parents above, and grandparents too when there are few enough of them.
			</li>
			<li>
				<ExploreLink :to="{ page: 'every-path', query: { node: 'medicine/viral-pneumonia' } }"
					>Every path</ExploreLink
				>: the same information as a list of routes, one line each.
			</li>
		</ul>

		<Demo ui="layered" data="medicine" focus="viral-pneumonia" :options="{ scope: 'ancestors' }" :height="420">
			Viral pneumonia's ancestors in the Medicine dataset, each drawn once.
		</Demo>

		<h2>Out in the world</h2>
		<ul>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="wikipedia-categories">Wikipedia</ExploreLink> has
				a hidden parents mode for its category tree: Tomatoes at the top and everything it is filed
				under beneath, Edible fruits turning up twice.
			</li>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="quickgo">QuickGO</ExploreLink>'s ancestor chart is
				the layered version: every route from a term to the top, each box once.
			</li>
		</ul>

		<h2>The trade-off</h2>
		<p>
			The upside-down tree reads like any outline but repeats every ancestor that two routes share;
			the ancestor chart draws each once but has to be read as a picture. Neither is a breadcrumb: a
			node with several parents has no single way up, which is the whole point.
		</p>
	</article>
</template>
