import type { Polyhierarchy } from './model';

/**
 * The same nodes with every parent → child edge reversed, so what was above is drawn below: the
 * roots become the old leaves, and a node's parents are listed as its children. Swapping the
 * parent and child fields of a junction table does the same to data in Directus.
 */
export function invert(data: Polyhierarchy): Polyhierarchy {
	return {
		...data,
		// Its own id, so UIs keyed on the dataset start afresh rather than reusing the other way up
		id: `${data.id}~inverted`,
		edges: data.edges.map(([parent, child]) => [child, parent])
	};
}
