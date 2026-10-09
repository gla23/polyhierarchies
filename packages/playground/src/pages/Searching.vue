<script setup lang="ts">
import { CassetteButtons } from '@polyhierarchies/ui';
import { ref } from 'vue';
import Demo from '../components/Demo.vue';
import ExploreLink from '../components/ExploreLink.vue';

const searchMode = ref<'hide' | 'routes' | 'inplace'>('routes');

/** Where the mode controls could live, weighed; the last is what the layout does */
const placements = [
	{ name: 'Only in the sidebar', pros: 'Directus’s place for a layout’s settings, saved with the view.', cons: 'Far from the search box: while searching you can’t see what a search will do, or change it in passing.' },
	{ name: 'One button opening a dialog', pros: 'Room to explain each mode properly, with pictures.', cons: 'The current mode is hidden behind a click, and changing it takes three.' },
	{ name: 'A strip above the table while searching', pros: 'In context and only when it matters: “5 match, routes shown”, with the switch beside it.', cons: 'Costs a row of height whenever you search, and a filter you left on keeps it there.' },
	{ name: 'Compact menus in the top bar', pros: '“Filter: Hide ▾” says the state at a glance, beside Directus’s own filter, and its menu explains each mode in a line. The sidebar keeps the same settings, saved with the view.', cons: 'More buttons in a busy bar, so only while there’s something for them to act on.' }
];
</script>

<template>
	<article class="concept">
		<h1>Searching a polyhierarchy</h1>
		<p class="lede">
			Searching a list is easy: keep what matches. Searching a tree whose items have several parents
			raises questions a list never does: where to show a match that lives in three places, what to
			do with its ancestors, what a folded branch should say, and what dragging means while half the
			tree is hidden.
		</p>

		<div class="demo-controls">
			<span>While searching</span>
			<CassetteButtons
				v-model="searchMode"
				label="While searching"
				:options="[
					{ value: 'hide', label: 'Hide, as a filter' },
					{ value: 'routes', label: 'Show the routes' },
					{ value: 'inplace', label: 'Keep my folds' }
				]"
			/>
		</div>
		<Demo ui="tree-table" data="medicine" :options="{ searchMode, openDepth: 2 }" :height="440">
			Type "pneumonia" into the search box, then press Enter to go to each match in turn. Hide, what a
			filter does in Directus, just removes what doesn't match; Routes opens every way to each match; Keep my folds marks them where
			they are and says how many a folded row holds.
		</Demo>

		<h2>Matches are items, rows are placements</h2>
		<p>
			A search matches <em>items</em>, but a tree draws <em>placements</em>, one per route to an
			item. "Pneumonia" matches five items, drawn as nine rows, because some of them have several
			parents. Every placement of a match is highlighted: showing only one would hide the very thing
			that makes the item interesting. With the routes to them the demo shows seventeen items on 21
			rows, so the count says both, in items as Directus counts them: "17 filtered items, 5 matching".
			Folds don't change it, as the page you're on doesn't change Directus's.
		</p>

		<h2>Why not just filter?</h2>
		<p>
			Filtering keeps the matching rows and drops the rest, which in a tree drops their ancestors too.
			That's the <em>induced subgraph</em> of the matches, and it's usually disconnected: a match whose
			parents didn't match has nowhere to go but the top level, with nothing to say where it came
			from. So the tree here loads whole and asks Directus separately which items match, with the
			same search and filter Directus would have used. Its rules decide what matches (every text
			field, relational filters, permissions); the tree only decides how to show it.
		</p>

		<h2>Routes can multiply</h2>
		<p>
			The routes to a match are every path from a root to it. In a tree there's one. In a
			polyhierarchy each item with two parents doubles the routes through it, so a chain of
			<em>n</em> such "diamonds" has 2<sup>n</sup> routes: fine for a medical vocabulary, ruinous for a
			graph built carelessly. The tables here stay bounded because they draw placements by the
			<ExploreLink :to="{ page: 'placements' }">duplicates rule</ExploreLink>: an item is drawn in full
			once and as a one-row duplicate elsewhere, so there are never more rows than links plus roots.
			Mirrors repeat whole branches and do multiply, which is why unfolding them stops at 3,000 rows,
			and <ExploreLink :to="{ page: 'every-path' }">Every path</ExploreLink> stops listing at 20.
		</p>

		<h2>Cycles</h2>
		<p>
			"Everything above a match" is the transitive closure of its parents, and with a
			<ExploreLink :to="{ page: 'cycles' }">cycle</ExploreLink> it would go round forever. Walking up
			has to remember what it has seen and stop at an item already on the route, the same rule that
			draws a loop as "above" rather than drawing it again.
		</p>

		<h2>Routes, or keep the folds?</h2>
		<p>
			Opening the way to every match is best for finding things, and worst for your sense of where you
			were: the tree you had arranged disappears. Keeping the folds is the reverse. So both are offered,
			and each softens its weakness. While the routes are shown, folds you make last only for that
			search. With the folds kept, a folded row says "3 matches below", and clicking that opens just
			the way to them.
		</p>

		<h2>Getting to a match</h2>
		<p>
			With the folds kept, everything folded and a search typed, the count can say "5 matching" while
			nothing on screen is highlighted: every match is inside a closed row. Typing makes it look worse,
			as the first letter's matches light up rows near the top and the next letter moves them all out of
			sight. So <strong>Enter goes to the next match</strong> (Shift+Enter the one before), the way a
			browser's find does: it opens the folds on the way to that match and no others, scrolls it to the
			middle and pulses it. The button beside the count does the same and says where you are, "3/9 ↵",
			counting placements, as each is highlighted.
		</p>
		<p>
			One behaviour serves all three modes because it only opens what isn't open. With the routes
			shown there's nothing to open (unless a route goes deeper than the tree opens; see below), so
			Enter just moves you along. Hiding or keeping folds, it opens one way at a time rather than all of
			them, which would be Routes by another name. It never clears the search: the matches are still
			what you're looking at. The ways it opens are kept in your folds as well, so when you do clear the
			search, the tree stays open there and scrolls to the last match you went to. Before, a Reveal
			button opened every route and cleared the search in one go, which landed you on all of them at
			once rather than the one you wanted.
		</p>
		<p>
			In Directus ⌘F (Ctrl+F) focuses this search, since rows far off screen are drawn without their cells
			(see the cost, below) and the browser's own find can't see them; pressed again from the search it's
			the browser's find. Picking items in a drawer, for a relation, the search is focused as the drawer
			opens.
		</p>

		<h2>How deep a search opens</h2>
		<p>
			Every level indents the tree column a little further, and the columns after it stay in line by
			giving up that width, so a route thirty levels deep pushes them off screen. So the routes, and
			Unfold all, stop at "Levels opened at most" (five, unless a view says otherwise). A row at the limit
			says "2 matches below", and clicking it opens the way on, as deep as it goes. Anything aimed at
			one row or one match goes all the way, because you asked for that one: ⌘-clicking a chevron opens
			everything inside it, "12 below" unfolds its branch, and Enter goes to a match however deep it
			is. ⌘-clicking Unfold all opens the lot.
		</p>

		<h2>Filters hide, searches look</h2>
		<p>
			Not every filter is a hunt. One like "not archived" is a rule about what belongs in the view at
			all, and highlighting what's left would be noise. So a filter's usual mode is <strong>Hide</strong>:
			what doesn't match simply isn't there, nothing is highlighted, and your folds stay. One thing is
			kept that didn't match: an ancestor of something that did, dimmed, because without it the match
			would have nowhere to hang. (Pick Hide in the demo above to see it.) A filter can also highlight,
			as a search does, or be turned <strong>Off</strong>: set aside without clearing it, so a careful
			filter needn't be rebuilt to look at the whole tree for a moment.
		</p>
		<p>
			A search is nearly always a hunt, so it only highlights, with the routes or in place. Searches were
			offered Hide and Off too at first, and dropped them: hiding barely differs from the routes in use,
			and turning a search off is just clearing it. In place earns its keep on a search that matches a
			lot, where opening every route would bury the tree.
		</p>
		<p>
			In Directus a filter and a search are separate things, so they stack. A filter that hides takes
			away first; a highlighting filter and the search then combine as Directus combines them, both must
			match; and the search's way decides how the highlights show. The usual pair is a filter that hides
			(archived items gone) under a search that shows routes (where is "pneumonia"?).
		</p>

		<h2>Where the switches go</h2>
		<p>
			Four ways for a filter and two for a search is a lot to explain, and the explanation is needed exactly when you
			search. The places weighed:
		</p>
		<table class="options">
			<thead>
				<tr>
					<th>Where</th>
					<th>For</th>
					<th>Against</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="place in placements" :key="place.name">
					<td>{{ place.name }}</td>
					<td>{{ place.pros }}</td>
					<td>{{ place.cons }}</td>
				</tr>
			</tbody>
		</table>
		<p>
			The layout does the last, for filters: a menu in the top bar, shown only while a filter is set, with
			the same setting in the sidebar as the view's default, where the menu can be turned off too. A
			search has no menu, as its two ways barely differ in use; that's a sidebar setting. The playground
			has only a search box, so its Tree table has a single "While searching" option.
		</p>

		<h2>Counting what a fold holds</h2>
		<p>
			"12 below" and "3 matches below" are sums over a branch, but a branch of placements, not of
			items: the same item can sit inside two folded branches and counts in both. Within one branch an
			item reached by several routes is counted once, which is why the count is of distinct items.
		</p>
		<p>
			While searching, a folded row counts the matches inside and says so, "3 matches below", as
			they're what you're after. With a filter alone it says "3 below", counting what unfolding it
			would show, and leaves the filter out of it: hiding things is what a filter is for, so what's
			gone is expected rather than news. The count at the top says how many pass: "5 matching" while
			searching, "4 pass the filter" with a filter alone.
		</p>

		<h2>Editing with half the tree hidden</h2>
		<p>
			A drop has to say where among its new parent's children a row goes, and while searching some of
			those children are hidden. The answer used here: a row goes straight after the visible row it
			was dropped after, which places it among all the children, hidden ones included, without anyone
			having to see them. Moving and adding parents are about items, not positions, so they work the
			same. Only sorting by a column stops dragging, as there's no order to drop into.
		</p>

		<h2>The cost</h2>
		<p>
			Loading the whole tree to search it is the price of context. On the 2,000-item cyclic dataset,
			2,727 rows, the table loads in under a second and searches in about one. Every row is there, so
			dragging and the scrollbar work as in any table, but rows over a screen away are drawn without
			their cells: Directus restyles the whole page whenever its sidebar moves, and every cell of a
			long tree made that a stutter. Beyond that, drawing only the rows on screen (virtual scrolling)
			would be the next step.
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
	width: 26%;
}
</style>
