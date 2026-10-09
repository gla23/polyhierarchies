<script setup lang="ts">
import ExploreLink from '../components/ExploreLink.vue';

/** The usual answers, weighed */
const approaches = [
	{
		name: 'Load children when a row opens',
		loads: 'Only what is open',
		good: 'Browsing at any size. The memory follows what you have open, not the size of the tree.',
		costs: 'A wait on every open. Counts, search and the duplicates rule all need the server. Unfold all needs a limit.',
		poly: 'Natural: each open asks for one node’s children, whichever parent it’s under.'
	},
	{
		name: '“Load more” under a big parent',
		loads: 'A page of one parent’s children',
		good: 'The parent with ten thousand children, which lazy loading alone would fetch whole.',
		costs: 'Dragging to a place that isn’t loaded yet; a sort by a column has to be the server’s.',
		poly: 'Unaffected: pages are per parent.'
	},
	{
		name: 'The server walks the tree and sends a window',
		loads: 'The hundred rows in view',
		good: 'The closest to “the whole tree, scrolled”: a true scrollbar, jumps to any position.',
		costs: 'The server must know your folds and walk the tree on every scroll; each fold is a round trip.',
		poly: 'Hard: the number of placements under a node has to be known to place anything after it.'
	},
	{
		name: 'Store it so the questions are cheap',
		loads: 'Whatever is asked, in one query',
		good: 'Subtrees, ancestors and counts without walking: a closure table, materialised paths or nested sets.',
		costs: 'Extra tables or columns to keep in step on every edit; some only allow one parent.',
		poly: 'Closure tables and recursive queries cope; materialised paths need a path per route; nested sets can’t.'
	},
	{
		name: 'Search first, tree second',
		loads: 'One node and its neighbours',
		good: 'Huge vocabularies, where nobody scrolls the whole tree: find a term, then see its parents and children.',
		costs: 'You lose the overview, the sense of where things are and how much is there.',
		poly: 'Comfortable: several parents is just several rows above the node.'
	},
	{
		name: 'Draw only the rows in view',
		loads: 'Everything still: it only draws less',
		good: 'Scrolling and restyling a long tree that is in memory.',
		costs: 'Solves drawing only, so it goes with one of the others.',
		poly: 'Unaffected.'
	}
];
</script>

<template>
	<article class="concept">
		<h1>Too big to load</h1>
		<p class="lede">
			Everything in this playground, and the Directus layout's tree mode, loads the whole hierarchy and
			works it out in the browser: which placement is drawn in full, how many items a folded row holds,
			every route to a search's matches. That is fine for thousands of items. At some size it isn't:
			the data won't travel, won't fit in a tab, or the server won't hand it over at once. Then the
			work moves to the server, and nearly every feature has to be rethought.
		</p>

		<h2>Where loading everything stops working</h2>
		<p>
			Not where drawing it stops: drawing only the rows on screen, or drawing far rows without their
			cells as the tree table does, keeps a long table smooth, and the
			<ExploreLink :to="{ page: 'searching' }">2,000-item dataset</ExploreLink> loads in under a
			second. The limits are elsewhere. Each item comes with its fields, so tens of thousands of items
			is megabytes to fetch and parse before anything shows. The browser keeps every row, and every
			placement of it, in memory. And servers cap a single request: a Directus instance can set a
			maximum number of items per query, so "everything" may not be on offer at all. A vocabulary like SNOMED CT, with hundreds
			of thousands of concepts and more links than that, is far past all three.
		</p>

		<h2>Why a tree can't just be paged</h2>
		<p>
			Directus pages a list: sort the items, take 25, then the next 25. A tree's order isn't a sort.
			It's a walk, each item followed by everything inside it, so an item's children can be on page
			nine while it's on page three, and page three by itself is a scatter of rows with no parents.
			Folding changes which rows exist at all, so "row 500" means something different every time you
			open or close something. And in a polyhierarchy rows are
			<ExploreLink :to="{ page: 'placements' }">placements</ExploreLink>, not items: an item with two
			parents is two rows, and with mirrors a branch is repeated under every parent, so the number of
			rows isn't even the number of items.
		</p>

		<h2>What has to be rethought</h2>
		<ul>
			<li>
				<strong>The scrollbar</strong> needs to know how many rows are showing, which depends on
				every fold and on what is under each one.
			</li>
			<li>
				<strong>"12 below"</strong> counts a whole branch, so it needs the branch, or a count kept
				for it on the server.
			</li>
			<li>
				<strong>The duplicates rule</strong>, drawing an item in full where it is first reached,
				needs the whole order to know which reach is first. Partly loaded, the rule has to be local:
				a stored <ExploreLink :to="{ page: 'primary-parents' }">primary parent</ExploreLink>, or the
				first parent by sort order.
			</li>
			<li>
				<strong>Search routes</strong> need every ancestor of every match. Only the server has
				them, so it has to answer with paths, not just ids.
			</li>
			<li>
				<strong><ExploreLink :to="{ page: 'cycles' }">Cycles</ExploreLink></strong> are the one thing
				that stays easy: walking down, the route so far is known, so a loop is still spotted where it
				closes.
			</li>
			<li>
				<strong>Sorting by a column</strong> sorts each parent's children, so it has to happen
				per parent on the server.
			</li>
			<li>
				<strong>Dragging</strong> can't drop into a branch that isn't loaded, and a moved branch's
				order has to be renumbered where the data lives.
			</li>
			<li>
				<strong>Select all and bulk edits</strong> mean rows you've never seen, so they become a
				query rather than a list of ids.
			</li>
			<li>
				<strong>Unfold all</strong> could ask for millions of rows, so a limit like "Levels opened at
				most" stops being a convenience and becomes a safeguard.
			</li>
			<li>
				<strong><ExploreLink :to="{ page: 'every-path' }">Every path</ExploreLink></strong> is a
				question for the server, and needs its own limit, as routes can multiply.
			</li>
		</ul>

		<h2>The usual answers</h2>
		<p>
			Each is good at something and costs something else; real systems combine several.
		</p>
		<table class="options">
			<thead>
				<tr>
					<th>Approach</th>
					<th>Loads</th>
					<th>Good for</th>
					<th>Costs</th>
					<th>Several parents</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="approach in approaches" :key="approach.name">
					<td>{{ approach.name }}</td>
					<td>{{ approach.loads }}</td>
					<td>{{ approach.good }}</td>
					<td>{{ approach.costs }}</td>
					<td>{{ approach.poly }}</td>
				</tr>
			</tbody>
		</table>
		<p>
			<strong>Loading children as rows open</strong> is what file managers do, and GitHub's file
			tree, and ontology browsers such as OLS. It's the most common because it's the simplest that
			scales: memory follows what you have open. What it gives up is everything that needs the whole
			tree, so those come back as server features, or go.
		</p>
		<p>
			<strong>A window from the server</strong> keeps the feel of one long table. Data grids built for
			millions of rows do this for grouped and tree data (AG Grid's server-side row model, for one),
			loading each open group's rows as they scroll into view. It's the most work: the server keeps or
			is sent your folds, and has to know how many rows each folded or open branch takes up.
		</p>
		<p>
			<strong>How the hierarchy is stored</strong> decides what the server can answer cheaply. A
			parent field, as Directus's taxonomy uses, answers "children of" and nothing deeper without a
			recursive query (<code>WITH RECURSIVE</code>, in PostgreSQL, MySQL 8 and SQLite), whose cost
			grows with the branch. Materialised paths store each placement's route as a string, so a branch is
			a prefix match and ancestors are in the string; with several parents that's one path per route,
			which multiplies. Nested sets number the tree so a branch is a range: very fast to read, slow to
			change, and only for one parent each. A closure table stores every ancestor and descendant pair
			with its distance, so branches, ancestors and counts are each one indexed query, and it copes with
			several parents; the price is size and the rows each edit has to touch. Large clinical
			vocabularies are usually queried through such a precomputed closure.
		</p>
		<p>
			<strong>Search first</strong> is how the biggest vocabularies are browsed: SNOMED CT browsers
			find a term, then show it with its parents and children around it, and nobody scrolls the whole
			tree. The tree becomes a view around one node, like
			<ExploreLink :to="{ page: 'looking-up' }">looking up</ExploreLink> from it.
		</p>

		<h2>What this layout would do</h2>
		<p>
			A sketch, not a promise. Open rows load their children from Directus, filtered by parent, a page at
			a time with "Load more" under a big parent. A search asks a small endpoint for its matches with
			their ancestors, a recursive query over the links, so routes, "3 matches below" and Enter still
			work. Counts come from a closure table, or a count kept on each item. The duplicates rule uses a
			stored primary parent. "Levels opened at most" becomes compulsory, and Unfold all works within what
			is loaded. Far rows without their cells, which the table already does, does the rest of the drawing.
		</p>
		<p>
			It's a bigger change than it sounds, because so much of what the tree does today is free once
			everything is in memory, and each piece needs a decision about what to precompute, what to ask
			for, and what to give up.
		</p>
	</article>
</template>

<style scoped>
.options {
	width: 100%;
	margin: 12px 0;
	font-size: 14px;
	border-collapse: collapse;
}

.options th,
.options td {
	padding: 8px 10px;
	text-align: left;
	vertical-align: top;
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

.options th,
.options td:first-child {
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.options td:first-child {
	width: 18%;
}
</style>
