/** The pages under Concepts: ideas that cut across several of the UIs in Explore */
export const concepts = [
	{
		id: 'placements',
		title: 'Duplicates, mirrors and loops',
		summary:
			'How a tree draws a node that lives in several places, and what stops a cycle being drawn forever.'
	},
	{
		id: 'looking-up',
		title: 'Looking up',
		summary:
			'Everything a node belongs to, rather than what is inside it, and turning the whole graph upside down.'
	},
	{
		id: 'siblings',
		title: 'Siblings',
		summary: 'Never stored: the other children of your parents, in one group per parent.'
	},
	{
		id: 'cycles',
		title: 'Cycles',
		summary: 'A loop is data, not an error, and every UI copes with it differently.'
	},
	{
		id: 'searching',
		title: 'Searching a polyhierarchy',
		summary: 'Matches with several homes, routes that multiply, and editing while half the tree is hidden.'
	},
	{
		id: 'selection',
		title: 'Selection',
		summary: 'A row you point at, not just open or tick: what it would enable, and how Directus could have it.'
	},
	{
		id: 'too-big',
		title: 'Too big to load',
		summary: 'When the hierarchy won’t fit in the browser: why a tree can’t just be paged, and the usual answers.'
	},
	{
		id: 'every-path',
		title: 'Every path to a node',
		summary: 'Every route down to a node at once: where it is, all the ways it can be reached.'
	},
	{
		id: 'primary-parents',
		title: 'Primary parents?',
		summary: 'Do UIs pick one parent as the real home? It depends on the shape of the UI.'
	}
] as const;

export type ConceptId = (typeof concepts)[number]['id'];
