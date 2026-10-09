/**
 * The pages under Concepts: ideas that cut across several of the UIs in Explore, then notes on
 * designing the tree table. In reading order, which Previous and Next follow.
 */
export const concepts = [
	{
		id: 'placements',
		group: 'ideas',
		title: 'Duplicates, mirrors and loops',
		summary:
			'How a tree draws a node that lives in several places, and what stops a cycle being drawn forever.'
	},
	{
		id: 'siblings',
		group: 'ideas',
		title: 'Siblings',
		summary: 'Never stored: the other children of your parents, in one group per parent.'
	},
	{
		id: 'cycles',
		group: 'ideas',
		title: 'Cycles',
		summary: 'A loop is data, not an error, and every UI copes with it differently.'
	},
	{
		id: 'looking-up',
		group: 'ideas',
		title: 'Looking up',
		summary:
			'Everything a node belongs to, rather than what is inside it, and turning the whole graph upside down.'
	},
	{
		id: 'every-path',
		group: 'ideas',
		title: 'Every path to a node',
		summary: 'Every route down to a node at once: where it is, all the ways it can be reached.'
	},
	{
		id: 'primary-parents',
		group: 'ideas',
		title: 'Primary parents?',
		summary: 'Do UIs pick one parent as the real home? It depends on the shape of the UI.'
	},
	{
		id: 'worked-out',
		group: 'ideas',
		title: 'Parents worked out',
		summary: 'SNOMED CT defines what each concept is and lets a classifier work out its parents: polyhierarchy as a result, not a choice.'
	},
	{
		id: 'searching',
		group: 'design',
		title: 'Searching a polyhierarchy',
		summary: 'Matches with several homes, routes that multiply, and editing while half the tree is hidden.'
	},
	{
		id: 'selection',
		group: 'design',
		title: 'Selection',
		summary: 'A row you point at, not just open or tick: what it would enable, and how Directus could have it.'
	},
	{
		id: 'too-big',
		group: 'design',
		title: 'Too big to load',
		summary: 'When the hierarchy won’t fit in the browser: why a tree can’t just be paged, and the usual answers.'
	}
] as const;

export type ConceptId = (typeof concepts)[number]['id'];

export const conceptGroups = [
	{ id: 'ideas', title: 'Ideas', about: 'True of any polyhierarchy, whatever draws it.' },
	{ id: 'design', title: 'Designing the tree table', about: 'What building the Directus layout raised: decisions made, and some still open.' }
] as const;
