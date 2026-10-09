import type { Graph } from '@polyhierarchies/core';
import { computed, reactive, watch, type Ref } from 'vue';

/** One placement of a node in the tree: the node reached by one particular path from a root */
export interface TreeRow {
	key: string;
	path: string[];
	id: string;
	/** null at the top level */
	parent: string | null;
	depth: number;
	/** Drawn in full here, with children. Every other placement is a terminal duplicate. */
	full: boolean;
	/** Drawn in full although it also lives elsewhere: a mirror, in mirror mode */
	mirror: boolean;
	/** A duplicate that is one of its own ancestors: where a cycle closes */
	loop: boolean;
	/** For a placement not drawn in full: the parent it is drawn in full under, null at the top */
	home: string | null;
	hasChildren: boolean;
	open: boolean;
}

export const placementKey = (path: string[]) => path.join('/');

export type Repeat = 'once' | 'mirror';

/** Unfolding everything in mirror mode repeats whole subtrees, so it stops at this many rows */
const unfoldLimit = 3000;

/**
 * Tree state shared by the tree-shaped UIs. Once: a node is drawn in full where a full render would
 * reach it first (its spanning-tree placement) and every other placement is a terminal duplicate.
 * Mirror: every placement is drawn in full, as Workflowy's mirrors are, except where a node would
 * repeat inside its own path. Either way that last rule is what stops a cycle recursing forever.
 */
export function useTree(
	graph: Ref<Graph>,
	focus: Ref<string | null>,
	repeat: Ref<Repeat>,
	/** Draw from these nodes instead of the roots, as when zoomed in on one */
	start?: Ref<string[] | null>,
	/** How many levels start open on a new dataset; none or 0 starts folded */
	openDepth?: Ref<number | null | undefined>
) {
	/** Placements, not nodes: a node under two parents opens and closes separately in each */
	const expanded = reactive(new Set<string>());

	/**
	 * Where each node is drawn in full. From the roots that's the graph's spanning tree; from other
	 * starting nodes it's the same walk grown from them, or a node whose full placement lay outside
	 * would only ever show as a duplicate.
	 */
	const startSpanning = computed(() => {
		const starts = start?.value;
		if (!starts) return null;
		const parentOf = new Map<string, string | null>();
		const walk = (id: string) => {
			for (const child of graph.value.children(id)) {
				if (parentOf.has(child)) continue;
				parentOf.set(child, id);
				walk(child);
			}
		};
		for (const id of starts)
			if (!parentOf.has(id)) {
				parentOf.set(id, null);
				walk(id);
			}
		return parentOf;
	});
	const spanningParent = (id: string) =>
		startSpanning.value ? (startSpanning.value.get(id) ?? null) : graph.value.spanningParent(id);

	const fullPath = (id: string) => {
		const path = [id];
		for (let parent = spanningParent(id); parent; parent = spanningParent(parent)) path.unshift(parent);
		return path;
	};

	/** Opens the way down to where `id` is drawn in full, so a focus chosen elsewhere shows */
	const reveal = (id: string) => {
		const path = fullPath(id);
		for (let end = 1; end < path.length; end++) expanded.add(placementKey(path.slice(0, end)));
	};

	const rows = computed(() => {
		const out: TreeRow[] = [];
		const visit = (path: string[]) => {
			const id = path.at(-1)!;
			const parent = path.at(-2) ?? null;
			const loop = path.slice(0, -1).includes(id);
			const first = spanningParent(id) === parent;
			const full = repeat.value === 'mirror' ? !loop : first;
			const children = full ? graph.value.children(id) : [];
			const key = placementKey(path);
			const open = children.length > 0 && expanded.has(key);
			out.push({
				key,
				path,
				id,
				parent,
				depth: path.length - 1,
				full,
				mirror: full && !first,
				loop,
				home: full ? null : spanningParent(id),
				hasChildren: children.length > 0,
				open
			});
			if (open) for (const child of children) visit([...path, child]);
		};
		for (const root of start?.value ?? graph.value.roots) visit([root]);
		return out;
	});

	/**
	 * How deep each node is drawn anywhere once everything is unfolded, in `once` mode: in full at
	 * its spanning-tree depth (often deeper than its shortest route), and as a duplicate one below
	 * each other parent's full placement. Mirrors can go deeper still.
	 */
	const deepest = computed(() => {
		const depthOf = new Map<string, number>();
		const full = (id: string): number => {
			let depth = depthOf.get(id);
			if (depth === undefined) {
				const parent = graph.value.spanningParent(id);
				depthOf.set(id, (depth = parent ? full(parent) + 1 : 0));
			}
			return depth;
		};
		return new Map(
			graph.value.data.nodes.map(({ id }) => [
				id,
				Math.max(full(id), ...graph.value.parents(id).map((parent) => full(parent) + 1))
			])
		);
	});

	/** Opens every placement above `depth`, within the same row limit as unfolding everything */
	const openTo = (depth: number) => {
		let rows = 0;
		const open = (path: string[]) => {
			const id = path.at(-1)!;
			if (++rows > unfoldLimit || path.length > depth) return;
			const parent = path.at(-2) ?? null;
			const full = repeat.value === 'mirror' ? !path.slice(0, -1).includes(id) : spanningParent(id) === parent;
			if (!full || !graph.value.children(id).length) return;
			expanded.add(placementKey(path));
			for (const child of graph.value.children(id)) open([...path, child]);
		};
		for (const root of start?.value ?? graph.value.roots) open([root]);
	};

	// A new dataset starts folded, or open to the given depth; an edit to the same one keeps what's open
	watch(
		[() => graph.value.data.id, () => openDepth?.value],
		() => {
			expanded.clear();
			if (openDepth?.value) openTo(openDepth.value);
			if (focus.value) reveal(focus.value);
		},
		{ immediate: true }
	);
	watch(focus, (id) => id && reveal(id), { immediate: true });
	// Switched to mirrors, the newly full placements open to the same depth as the rest
	watch(repeat, () => openDepth?.value && openTo(openDepth.value));
	// Zoomed in on a node, it starts open: its contents are the point
	watch(() => start?.value, (starts) => starts?.forEach((id) => expanded.add(placementKey([id]))), {
		immediate: true
	});

	return {
		rows,
		deepest: (id: string) => deepest.value.get(id) ?? 0,
		toggle: (row: TreeRow) => (row.open ? expanded.delete(row.key) : expanded.add(row.key)),
		open: (row: TreeRow) => expanded.add(row.key),
		/** Finite even with cycles: only full placements open, and duplicates have no children */
		unfoldAll: () => {
			if (repeat.value === 'once') {
				for (const { id } of graph.value.data.nodes)
					if (graph.value.children(id).length) expanded.add(placementKey(fullPath(id)));
				return;
			}
			// Mirrors repeat whole subtrees, so walk the placements themselves, up to a limit
			let rows = 0;
			const open = (path: string[]) => {
				if (++rows > unfoldLimit) return;
				const id = path.at(-1)!;
				if (path.slice(0, -1).includes(id) || !graph.value.children(id).length) return;
				expanded.add(placementKey(path));
				for (const child of graph.value.children(id)) open([...path, child]);
			};
			for (const root of start?.value ?? graph.value.roots) open([root]);
		},
		foldToFocus: () => {
			expanded.clear();
			if (focus.value) reveal(focus.value);
		},
		foldAll: () => expanded.clear()
	};
}

/** One placement in the whole placement tree, with everything below it, for a table that draws them all */
export interface Placement extends Omit<TreeRow, 'open'> {
	/** The placement it sits under, by key; null at the top */
	parentKey: string | null;
	/** Every placement below it, depth first, by key */
	descendants: string[];
}

/**
 * Every placement, folded or not, in the order the rows run: what a table that keeps folded rows in
 * the page (to animate them) draws from. Placements always form a tree, however many parents the
 * nodes have, which is what lets a one-parent tree view draw a polyhierarchy. Same rule as `useTree`:
 * in full where the spanning tree reaches a node first (everywhere, with mirrors), a terminal
 * duplicate elsewhere, and a loop where a node would repeat inside its own route. Mirrors can
 * multiply, so they stop at `limit` rows; otherwise there's a row per edge (and root), and a cap
 * would only lose a big tree's last rows.
 */
export function placementTree(graph: Graph, repeat: Repeat, limit = repeat === 'mirror' ? unfoldLimit : Infinity): Placement[] {
	const out: Placement[] = [];
	const visit = (path: string[]) => {
		if (out.length >= limit) return;
		const id = path.at(-1)!;
		const parent = path.at(-2) ?? null;
		const loop = path.slice(0, -1).includes(id);
		const first = graph.spanningParent(id) === parent;
		const full = repeat === 'mirror' ? !loop : first;
		const children = full ? graph.children(id) : [];
		const key = placementKey(path);
		const placement: Placement = {
			key,
			path,
			id,
			parent,
			parentKey: parent === null ? null : placementKey(path.slice(0, -1)),
			depth: path.length - 1,
			full,
			mirror: full && !first,
			loop,
			home: full ? null : graph.spanningParent(id),
			hasChildren: children.length > 0,
			descendants: []
		};
		const at = out.length;
		out.push(placement);
		for (const child of children) visit([...path, child]);
		// Depth first, so everything below is what came after it
		placement.descendants = out.slice(at + 1).map((below) => below.key);
	};
	for (const root of graph.roots) visit([root]);
	return out;
}
