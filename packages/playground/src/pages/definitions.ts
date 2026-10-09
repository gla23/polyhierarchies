import type { Polyhierarchy } from '@polyhierarchies/core';

/**
 * A toy of SNOMED CT's model, for the Parents worked out page: each concept is defined by what it is,
 * a few attribute values, and its parents are worked out from those definitions rather than stored.
 */
export type Attribute = 'process' | 'site' | 'agent';
export type Definition = Partial<Record<Attribute, string>>;

/** Each attribute's values, each naming the broader value it's a kind of */
export const values: Record<Attribute, Record<string, string | null>> = {
	process: { Infection: null, Inflammation: null },
	site: { 'Respiratory tract': null, 'Lower respiratory tract': 'Respiratory tract', Lung: 'Lower respiratory tract' },
	agent: { Organism: null, Virus: 'Organism', Bacterium: 'Organism' }
};

export interface Concept {
	id: string;
	label: string;
	defined: Definition;
}

export const concepts: Concept[] = [
	{ id: 'disease', label: 'Disease', defined: {} },
	{ id: 'infection', label: 'Infectious disease', defined: { process: 'Infection' } },
	{ id: 'respiratory-infection', label: 'Respiratory infection', defined: { process: 'Infection', site: 'Respiratory tract' } },
	{ id: 'lower-respiratory-infection', label: 'Lower respiratory tract infection', defined: { process: 'Infection', site: 'Lower respiratory tract' } },
	{ id: 'viral-infection', label: 'Viral infection', defined: { process: 'Infection', agent: 'Virus' } },
	{ id: 'bacterial-infection', label: 'Bacterial infection', defined: { process: 'Infection', agent: 'Bacterium' } },
	{ id: 'viral-respiratory-infection', label: 'Viral respiratory infection', defined: { process: 'Infection', site: 'Respiratory tract', agent: 'Virus' } },
	{ id: 'infective-pneumonia', label: 'Infective pneumonia', defined: { process: 'Infection', site: 'Lung' } },
	{ id: 'pneumonitis', label: 'Pneumonitis', defined: { process: 'Inflammation', site: 'Lung' } }
];

/** Added on the page to show a whole branch moving: one definition between others */
export const between: Concept = {
	id: 'viral-lower-respiratory-infection',
	label: 'Viral lower respiratory infection',
	defined: { process: 'Infection', site: 'Lower respiratory tract', agent: 'Virus' }
};

/** A value is a kind of another if walking up from it reaches it */
function isA(attribute: Attribute, value: string, broader: string) {
	for (let at: string | null = value; at; at = values[attribute][at] ?? null) if (at === broader) return true;
	return false;
}

/** `a` sits under `b` when it says at least what `b` says: each of `b`'s values, or a kind of it */
export function subsumes(b: Concept, a: Concept) {
	return (Object.entries(b.defined) as [Attribute, string][]).every(([attribute, value]) => {
		const own = a.defined[attribute];
		return own !== undefined && isA(attribute, own, value);
	});
}

/** The most specific concepts above each one: what a classifier would make its parents */
export function classify(all: Concept[]): Polyhierarchy {
	const edges: [string, string][] = [];
	for (const concept of all) {
		const above = all.filter((other) => other !== concept && subsumes(other, concept) && !subsumes(concept, other));
		for (const parent of above) {
			if (!above.some((other) => other !== parent && subsumes(parent, other))) edges.push([parent.id, concept.id]);
		}
	}
	return {
		id: 'worked-out',
		name: 'Worked out',
		description: '',
		nodes: all.map(({ id, label }) => ({ id, label })),
		edges,
		jumps: []
	};
}
