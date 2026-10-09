<script setup lang="ts">
import Demo from '../components/Demo.vue';
import ExploreLink from '../components/ExploreLink.vue';
</script>

<template>
	<article class="concept">
		<h1>Siblings</h1>
		<p class="lede">
			Siblings are never stored. They are the other children of your parents, so a node with three
			parents has three sets of siblings, one through each, and they can overlap.
		</p>

		<Demo ui="plex" data="food" focus="tomato" :height="400">
			Tomato's siblings on the right, grouped by the parent they share. Hover Vegetable above to light
			the group that comes through it.
		</Demo>

		<h2>Grouped by parent</h2>
		<p>
			Through Fruit, Tomato's siblings are Apple, Banana and the rest of the fruit; through Vegetable,
			Carrot, Cucumber and Pumpkin; through Salad, Cucumber, Avocado and Olive. Cucumber shares three
			parents with Tomato, so it is a sibling three ways over. Deriving siblings keeps them right by
			construction: change a parent and the siblings change with it, with nothing else to update.
		</p>

		<h2>How each UI does it</h2>
		<ul>
			<li>
				<ExploreLink :to="{ ui: 'plex', data: 'food', focus: 'tomato' }">Plex</ExploreLink>: siblings
				to the right, in one group per parent. Hover a parent to light its group; hover a sibling to
				light the parent it came through.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'tree-lab', data: 'food', focus: 'tomato', options: { openDepth: 2 } }"
					>Tree lab</ExploreLink
				>
				and
				<ExploreLink :to="{ ui: 'tree-table', data: 'food', focus: 'tomato' }">Tree table</ExploreLink>:
				siblings are whoever sits beside a placement, so each of Tomato's placements has its own.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'miller', data: 'food', focus: 'tomato' }">Miller columns</ExploreLink>:
				a column is one parent's children, so it is the siblings through that parent; re-routing
				through another parent swaps the column for the other set.
			</li>
			<li>
				<ExploreLink :to="{ ui: 'faceted', data: 'food' }">Faceted</ExploreLink>: tick a facet and the
				results are its children, so ticking Tomato's parents one at a time lists its siblings through
				each.
			</li>
		</ul>

		<h2>Out in the world</h2>
		<ul>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="thebrain">TheBrain</ExploreLink> puts siblings on
				the right of every thought and lights the ones through a parent when you hover it, which is
				where the Plex's hover comes from.
			</li>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }" hash="tiddlywiki">TiddlyWiki</ExploreLink>: click a tag
				on a note and it lists every other note with that tag, the siblings through that parent.
			</li>
		</ul>

		<h2>The trade-off</h2>
		<p>
			A busy parent gives every child a crowd of siblings. TheBrain and the Plex both cap what they
			show; a tree just shows them, which is fine until a parent has hundreds of children.
		</p>
	</article>
</template>
