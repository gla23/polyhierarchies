<script setup lang="ts">
import ExploreLink from '../components/ExploreLink.vue';

/** The same six foods stored both ways; the links table has one row more, and that row is the point */
const parentField = [
	['Food', '—'],
	['Fruit', 'Food'],
	['Vegetable', 'Food'],
	['Apple', 'Fruit'],
	['Tomato', 'Fruit'],
	['Carrot', 'Vegetable']
];
const links = [
	['Food', 'Fruit'],
	['Food', 'Vegetable'],
	['Fruit', 'Apple'],
	['Fruit', 'Tomato'],
	['Vegetable', 'Tomato'],
	['Vegetable', 'Carrot']
];

type Box = { label: string; x: number; y: number };
const at = (label: string, x: number, y: number): Box => ({ label, x, y });
const tree = [at('Food', 150, 18), at('Fruit', 80, 64), at('Vegetable', 220, 64), at('Apple', 40, 110), at('Tomato', 120, 110), at('Carrot', 220, 110)];
const poly = [at('Food', 150, 18), at('Fruit', 80, 64), at('Vegetable', 220, 64), at('Apple', 40, 110), at('Tomato', 150, 110), at('Carrot', 260, 110)];
const lines = (boxes: Box[], pairs: string[][]) =>
	pairs.map(([from, to]) => {
		const a = boxes.find((box) => box.label === from)!;
		const b = boxes.find((box) => box.label === to)!;
		return { key: `${from}-${to}`, ends: { x1: a.x, y1: a.y + 11, x2: b.x, y2: b.y - 11 }, extra: from === 'Vegetable' && to === 'Tomato' };
	});
const treeLines = lines(tree, parentField.filter(([, parent]) => parent !== '—').map(([item, parent]) => [parent!, item!]));
const polyLines = lines(poly, links);

const grows = [
	{ question: 'Where does Tomato go in an outline, when it lives in two places?', page: 'placements' },
	{ question: 'What does it belong to, and by how many routes?', page: 'looking-up' },
	{ question: 'Who are its siblings, when it has two sets?', page: 'siblings' },
	{ question: 'What if following the links leads back to the start?', page: 'cycles' },
	{ question: 'Is one parent the real one?', page: 'primary-parents' },
	{ question: 'What if nobody picks the parents at all?', page: 'worked-out' }
];
</script>

<template>
	<article class="concept intro">
		<h1>Polyhierarchies</h1>
		<p class="lede">
			This project started with plain data modelling: the two usual ways a database stores a
			hierarchy. Follow the second one and a surprising amount grows out of it.
		</p>

		<h2>Two ways to store a hierarchy</h2>
		<div class="ways">
			<figure>
				<figcaption><strong>A parent field.</strong> Each item names its one parent.</figcaption>
				<table>
					<thead>
						<tr><th>Item</th><th>Parent</th></tr>
					</thead>
					<tbody>
						<tr v-for="[item, parent] in parentField" :key="item"><td>{{ item }}</td><td>{{ parent }}</td></tr>
					</tbody>
				</table>
				<svg viewBox="0 0 300 124" role="img" aria-label="A tree: Food above Fruit and Vegetable; Apple and Tomato under Fruit, Carrot under Vegetable">
					<line v-for="line in treeLines" :key="line.key" v-bind="line.ends" />
					<g v-for="box in tree" :key="box.label" :class="{ tomato: box.label === 'Tomato' }">
						<rect :x="box.x - 36" :y="box.y - 11" width="72" height="22" rx="4" />
						<text :x="box.x" :y="box.y + 4">{{ box.label }}</text>
					</g>
				</svg>
				<p>A tree: everything has exactly one place.</p>
			</figure>
			<figure>
				<figcaption><strong>A table of links.</strong> Each row joins a parent to a child.</figcaption>
				<table>
					<thead>
						<tr><th>Parent</th><th>Child</th></tr>
					</thead>
					<tbody>
						<tr v-for="[parent, child] in links" :key="`${parent}-${child}`" :class="{ extra: parent === 'Vegetable' && child === 'Tomato' }">
							<td>{{ parent }}</td><td>{{ child }}</td>
						</tr>
					</tbody>
				</table>
				<svg viewBox="0 0 300 124" role="img" aria-label="The same items, with Tomato under both Fruit and Vegetable">
					<line v-for="line in polyLines" :key="line.key" v-bind="line.ends" :class="{ extra: line.extra }" />
					<g v-for="box in poly" :key="box.label" :class="{ tomato: box.label === 'Tomato' }">
						<rect :x="box.x - 36" :y="box.y - 11" width="72" height="22" rx="4" />
						<text :x="box.x" :y="box.y + 4">{{ box.label }}</text>
					</g>
				</svg>
				<p>Nothing stops a second row for Tomato. Now it has two parents: a <strong>polyhierarchy</strong>.</p>
			</figure>
		</div>
		<p>
			The table of links is a junction, the many-to-many relation every database already has. Nothing
			about it is exotic. But one extra row raises questions a tree never had to answer:
		</p>
		<ul class="grows">
			<li v-for="item in grows" :key="item.page">
				<ExploreLink :to="{ page: item.page }">{{ item.question }}</ExploreLink>
			</li>
		</ul>
		<p>
			The answers turn out to be interesting, and the UIs they lead to are useful well beyond the
			fruit bowl: medical vocabularies, task lists, notes, anything filed under more than one heading.
		</p>

		<h2>Finding your way round</h2>
		<ul class="sections">
			<li>
				<ExploreLink :to="{ data: 'food', focus: 'tomato' }"><strong>Explore</strong></ExploreLink>
				<span>The same datasets drawn by eight different UIs, from an outline to a force graph. Swap the UI or the data in one click and keep your place.</span>
			</li>
			<li>
				<ExploreLink :to="{ page: 'concepts' }"><strong>Concepts</strong></ExploreLink>
				<span>One idea per page, like the questions above, each with a live example and how every UI handles it.</span>
			</li>
			<li>
				<ExploreLink :to="{ page: 'prior-art' }"><strong>Prior art</strong></ExploreLink>
				<span>Real sites that already give items several parents, with screenshots and a walkthrough for each.</span>
			</li>
		</ul>
	</article>
</template>

<style scoped>
.ways {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
	gap: 16px;
	margin: 12px 0 20px;
}

figure {
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin: 0;
	padding: 14px 16px;
	background: var(--theme--background-subdued);
	border: var(--theme--border-width) solid var(--theme--border-color-subdued);
	border-radius: var(--theme--border-radius);
}

figure p {
	margin: 0;
	font-size: 14px;
	color: var(--theme--foreground-subdued);
}

table {
	font-size: 13px;
	border-collapse: collapse;
}

th,
td {
	padding: 2px 16px 2px 0;
	text-align: left;
}

th {
	font-weight: 600;
	color: var(--theme--foreground-subdued);
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

tr.extra td {
	font-weight: 600;
	color: var(--theme--primary);
}

svg {
	width: 100%;
	height: auto;
}

line {
	stroke: var(--theme--border-color-accent);
	stroke-width: 1.5;
}

line.extra {
	stroke: var(--theme--primary);
	stroke-width: 2.5;
}

rect {
	fill: var(--theme--background);
	stroke: var(--theme--border-color-accent);
}

.tomato rect {
	fill: var(--theme--primary-background);
	stroke: var(--theme--primary);
}

text {
	font-size: 12px;
	text-anchor: middle;
	fill: var(--theme--foreground);
}

.grows li::marker {
	color: var(--theme--primary);
}

.sections {
	padding: 0;
	list-style: none;
}

.sections li {
	display: flex;
	flex-direction: column;
	padding: 10px 0;
	border-bottom: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

.sections li + li {
	margin-top: 0;
}

.sections a {
	text-decoration: none;
}

.sections span {
	color: var(--theme--foreground-subdued);
}
</style>
