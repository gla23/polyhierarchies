<script setup lang="ts">
import { createGraph } from '@polyhierarchies/core';
import { TreeLab } from '@polyhierarchies/ui';
import { computed, ref } from 'vue';
import ExploreLink from '../components/ExploreLink.vue';
import { between, classify, concepts, subsumes, values, type Attribute, type Concept } from './definitions';

const attributes: { key: Attribute; label: string }[] = [
	{ key: 'process', label: 'Process' },
	{ key: 'site', label: 'Finding site' },
	{ key: 'agent', label: 'Causative agent' }
];
/** The concept you define (viral pneumonia, to start), and whether the one in between exists yet */
const yours = ref<Record<Attribute, string>>({ process: 'Infection', site: 'Lung', agent: 'Virus' });
const withBetween = ref(false);
const mine = computed<Concept>(() => ({
	id: 'yours',
	label: 'Your concept',
	defined: Object.fromEntries(Object.entries(yours.value).filter(([, value]) => value))
}));
const others = computed(() => [...concepts, ...(withBetween.value ? [between] : [])]);
const graph = computed(() => createGraph(classify([...others.value, mine.value])));
/** Defined exactly as another: a classifier calls them the same concept */
const sameAs = computed(() => others.value.find((other) => subsumes(other, mine.value) && subsumes(mine.value, other))?.label);
const focus = ref<string | null>('yours');
const parentNames = computed(() => {
	const names = graph.value.parents('yours').map((id) => graph.value.label(id));
	return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? 'nothing: it is a root');
});
</script>

<template>
	<article class="concept">
		<h1>Parents worked out</h1>
		<p class="lede">
			Most hierarchies are filed by hand: someone decides each item's parents. SNOMED CT, the
			clinical vocabulary behind many health records, mostly isn't. Its authors say what each concept
			is, a disease of this site, caused by that, by this process, and a program called a classifier
			works out where it belongs. Several parents aren't a choice anyone makes; they follow from the
			definitions.
		</p>

		<div class="definition">
			<label v-for="attribute in attributes" :key="attribute.key">
				<span>{{ attribute.label }}</span>
				<select v-model="yours[attribute.key]">
					<option value="">Not said</option>
					<option v-for="value in Object.keys(values[attribute.key])" :key="value" :value="value">{{ value }}</option>
				</select>
			</label>
			<label class="between">
				<input v-model="withBetween" type="checkbox" />
				Define {{ between.label }}
			</label>
		</div>
		<figure class="demo">
			<div class="stage">
				<TreeLab v-model:focus="focus" :graph="graph" :open-depth="6" density="compact" />
			</div>
			<figcaption>
				<template v-if="sameAs">
					Your concept is defined exactly as {{ sameAs }}, so a classifier would call them the same
					concept; here it sits beside it, under {{ parentNames }}.
				</template>
				<template v-else>Your concept's parents, worked out: {{ parentNames }}.</template>
				Nothing here stores a parent; the tree is classified afresh from the definitions each time one
				changes.
			</figcaption>
		</figure>

		<h2>Defined, not filed</h2>
		<p>
			Each concept here is a few attribute values, a simplified version of SNOMED CT's own. A concept
			sits under another when it says at least as much: for each of the broader concept's values it has
			the same value or a kind of it, as a lung is a kind of lower respiratory tract. Its parents are
			the most specific concepts that hold. A classifier does this for all of SNOMED CT's hundreds of
			thousands of concepts, in a description logic chosen because it can be reasoned with quickly.
		</p>

		<h2>Stated and inferred</h2>
		<p>
			The authors state each concept's definition, often with a parent or two to start from, and the
			classifier infers the rest. A release carries both: the stated form, as written, and the inferred
			one, which is what browsers show. A concept is either <em>primitive</em>, where its definition
			says what must be true of it but not enough to recognise it, so nothing lands under it unless
			someone says so, or <em>fully defined</em>, where anything matching its definition is placed
			beneath it.
		</p>

		<h2>Several parents for free</h2>
		<p>
			Viral pneumonia is an infection of the lung caused by a virus, which makes it both an infective
			pneumonia and a viral respiratory infection. So it has two parents, and neither is the real one:
			there's no
			<ExploreLink :to="{ page: 'primary-parents' }">primary parent</ExploreLink> to pick, because
			nobody picked either. Much of SNOMED CT's polyhierarchy comes about this way.
		</p>

		<h2>What it means for a tree</h2>
		<p>
			A concept can't be dragged somewhere else: its place follows from what it is. You change its
			definition and classify again, and authoring tools show the stated and inferred forms side by
			side. One new definition can move a whole branch. Tick
			{{ between.label }} above and your concept slides under it, along with anything else that
			matches, without anyone touching them. A tree of such a vocabulary is read only for its structure,
			and the <ExploreLink :to="{ page: 'placements' }">duplicates rule</ExploreLink> earns its keep, as
			a concept has as many parents as its definition gives it.
		</p>

		<h2>Where else it turns up</h2>
		<p>
			Many OWL ontologies in biology work this way for part of their hierarchy: the Gene Ontology gives
			some terms logical definitions and lets a reasoner add the links between them. Long before, and on
			paper, faceted classification built a book's subject from facets, as in Ranganathan's Colon
			Classification. The
			<ExploreLink :to="{ ui: 'faceted', data: 'food' }">Faceted</ExploreLink> view here goes the other
			way, using parents as facets to narrow things down.
		</p>

		<h2>And here</h2>
		<p>
			This playground and the Directus layout store parents directly, as almost every database does.
			Storing definitions instead and working the links out, with a reasoner run by a Directus flow,
			say, would make the links a result rather than an input: the tree would turn read only, and every
			edit would be a change of definition.
		</p>
	</article>
</template>

<style scoped>
.definition {
	display: flex;
	flex-wrap: wrap;
	align-items: end;
	gap: 12px 20px;
	margin: 20px 0 8px;
	font-size: 13px;
}

.definition label {
	display: flex;
	flex-direction: column;
	gap: 4px;
	color: var(--theme--foreground-subdued);
}

.definition select {
	padding: 4px 8px;
	font: inherit;
	color: var(--theme--form--field--input--foreground);
	background: var(--theme--form--field--input--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.definition .between {
	flex-direction: row;
	align-items: center;
	gap: 6px;
	color: var(--theme--foreground);
}

.demo {
	margin: 0 0 24px;
}

.stage {
	height: 340px;
	padding: 12px;
	overflow: auto;
	background: var(--theme--background);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
}

figcaption {
	margin-top: 6px;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}
</style>
