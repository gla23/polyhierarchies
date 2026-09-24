import type { PolyNode, Polyhierarchy } from './model';

type Meta = Pick<Polyhierarchy, 'id' | 'name' | 'description' | 'start' | 'columns'>;
/** Everything about a node but where it sits, keyed by its label as written in the outline */
type Details = Record<string, Omit<PolyNode, 'id' | 'label'>>;

export const slug = (label: string) =>
	label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/**
 * A dataset written as an indented outline, two spaces a level:
 *
 *     Fruit
 *       Tomato
 *     Vegetable
 *       Tomato
 *     ---
 *     Tomato ~ Pumpkin
 *
 * A label written more than once is one node with several parents, so Tomato is both a fruit and a
 * vegetable. Repeating a label at the top level only adds children to it. Lines after `---` are
 * jumps. Icons, colours and column values come separately in `details`, so the outline stays
 * readable as the hierarchy it describes.
 */
export function fromOutline(meta: Meta, text: string, details: Details = {}): Polyhierarchy {
	const nodes = new Map<string, string>();
	const edges = new Map<string, [string, string]>();
	const jumps: [string, string][] = [];

	const node = (label: string) => {
		const id = slug(label);
		if (!nodes.has(id)) nodes.set(id, label);
		return id;
	};

	const [hierarchy = '', related = ''] = text.split(/^---$/m);
	const stack: { depth: number; id: string }[] = [];
	for (const line of hierarchy.split('\n')) {
		if (!line.trim()) continue;
		const indent = line.length - line.trimStart().length;
		if (indent % 2) throw new Error(`Odd indent in "${line}"`);
		const depth = indent / 2;
		const id = node(line.trim());

		while (stack.length && stack.at(-1)!.depth >= depth) stack.pop();
		const parent = stack.at(-1);
		if (parent) {
			if (depth !== parent.depth + 1) throw new Error(`"${line.trim()}" skips a level`);
			edges.set(`${parent.id}>${id}`, [parent.id, id]);
		}
		stack.push({ depth, id });
	}

	for (const line of related.split('\n')) {
		if (!line.trim()) continue;
		const [a, b] = line.split('~').map((label) => label.trim());
		if (!a || !b) throw new Error(`Jumps are written "A ~ B", not "${line}"`);
		jumps.push([node(a), node(b)]);
	}

	const detailsById = new Map(Object.entries(details).map(([label, rest]) => [slug(label), rest]));
	for (const [id] of detailsById)
		if (!nodes.has(id)) throw new Error(`Details for "${id}", which isn't in ${meta.id}`);

	return {
		...meta,
		nodes: [...nodes].map(([id, label]) => ({ id, label, ...detailsById.get(id) })),
		edges: [...edges.values()],
		jumps
	};
}
