<script setup lang="ts">
import ExploreLink from '../components/ExploreLink.vue';

const options = [
	{
		name: 'A. Click selects, double-click opens',
		pros: 'The file manager model everyone knows from Finder and Explorer. Every gain below is one click away.',
		cons: 'Breaks the habit of every Directus page, where a click opens the item. Opening takes two clicks, and touch screens have no double-click.'
	},
	{
		name: 'B. Click opens, the keyboard has a cursor',
		pros: 'Nothing changes for the mouse. Tab into the table and the arrow keys move a cursor, ← and → fold, Enter opens.',
		cons: 'Mouse users never find it. The gains that need a pointer (reveal the selected match, a toolbar for the row) stay hidden.'
	},
	{
		name: 'C. A select zone, open everywhere else',
		pros: 'Both at once: clicking the indent or the chevron area selects, the rest of the row opens as now.',
		cons: 'Two behaviours on one row, told apart only by where you click. Easy to get wrong, hard to explain.'
	},
	{
		name: 'D. Click opens a side drawer, the row stays current',
		pros: 'The mail client model: the list stays put while the item opens beside it, so the row you opened is naturally the current one.',
		cons: 'A big change to how Directus opens items, and a narrow screen has no room beside the table.'
	},
	{
		name: 'E. The last ticked row is current',
		pros: 'No new idea: the checkboxes Directus already has.',
		cons: 'Mixes up picking rows for a batch action with pointing at one, so a stray tick ends up in the next bulk edit.'
	},
	{
		name: 'F. A sidebar setting chooses',
		pros: 'Directus behaviour by default; whoever wants selection turns it on per view, as layouts already have their own options.',
		cons: 'Two behaviours to build and explain, and a shared view can surprise someone who didn\'t choose it.'
	}
];
</script>

<template>
	<article class="concept">
		<h1>Selection</h1>
		<p class="lede">
			Directus's table has no current row. A click opens the item, and the checkboxes pick rows for a
			batch action. Many of the ideas on these pages would be easier with a third thing: a row you're
			pointing at, a cursor, that stays put while you do something with it.
		</p>

		<h2>Three things a click could mean</h2>
		<ul>
			<li><strong>Opening</strong>: go to the item. Directus's click.</li>
			<li><strong>Checking</strong>: pick rows for a batch action. Directus's checkboxes.</li>
			<li>
				<strong>Selecting</strong>: point at one row and keep pointing. What the
				<ExploreLink :to="{ ui: 'tree-lab', data: 'food', focus: 'tomato' }">Tree lab</ExploreLink> and
				every other UI here call the focus. The
				<ExploreLink :to="{ ui: 'tree-table', data: 'food' }">Tree table</ExploreLink> doesn't have it,
				because it's exactly what Directus draws.
			</li>
		</ul>

		<h2>What it would make possible</h2>
		<ul>
			<li>
				<strong>The keyboard</strong>: ↑ and ↓ move, ← and → fold and unfold, Enter opens, Space ticks.
				A tree is the place keyboard navigation pays off most.
			</li>
			<li>
				<strong>Finding it again after a search</strong>: Enter already goes from match to match, and
				clearing the search lands on the last one you went to, which is a cursor in all but name. With
				selection, any row you point at could be where you land, not only a match. See
				<ExploreLink :to="{ page: 'searching' }">Searching a polyhierarchy</ExploreLink>.
			</li>
			<li>
				<strong>Its other homes, held still</strong>: hovering a row lights its other placements; a
				selected row could keep them lit while you scroll to look at them.
			</li>
			<li>
				<strong>Actions without dragging</strong>: a small toolbar for the selected row (add a child,
				add a parent, remove it from this parent), and cut and paste: cut a row and paste it on another
				to move it, copy and paste to give it another parent. Easier than a long drag, and possible
				without a mouse.
			</li>
			<li>
				<strong>Next and previous match</strong> move the selection, opening the way as they go.
			</li>
			<li><strong>A detail pane</strong> beside the tree, showing whatever is selected.</li>
		</ul>

		<h2>Ways to add it to Directus</h2>
		<table class="options">
			<thead>
				<tr>
					<th>Option</th>
					<th>For</th>
					<th>Against</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="option in options" :key="option.name">
					<td>{{ option.name }}</td>
					<td>{{ option.pros }}</td>
					<td>{{ option.cons }}</td>
				</tr>
			</tbody>
		</table>

		<h2>The recommendation</h2>
		<p>
			Keep Directus's click: people use many collections, and one table that behaves differently from
			the rest is a trap. Give the table a <strong>keyboard cursor</strong> always (B): it costs mouse
			users nothing. Then add a <strong>sidebar setting</strong> (F), "Clicking a row: opens it /
			selects it", where <em>selects</em> switches to the file manager model (A): a click selects,
			double-click or Enter opens, and a slim toolbar appears for the selected row. Those who live in
			one big tree turn it on for that view; everyone else never meets it.
		</p>
		<p>
			Until then the Tree table stays exactly as Directus draws it, checkboxes and all, and selection
			lives in the Tree lab.
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

.options th {
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.options td:first-child {
	width: 26%;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}
</style>
