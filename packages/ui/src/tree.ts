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
	hasChildren: boolean;
	open: boolean;
}

const placementKey = (path: string[]) => path.join('/');

export type Repeat = 'once' | 'mirror';

/** Unfolding everything in mirror mode repeats whole subtrees, so it stops at this many rows */
const unfoldLimit = 3000;

/**
 * Tree state shared by the tree-shaped UIs. Once: a node is drawn in full where a full render would
 * reach it first (its spanning-tree placement) and every other placement is a terminal duplicate.
 * Mirror: every placement is drawn in full, as Workflowy's mirrors are, except where a node would
 * repeat inside its own path. Either way that last rule is what stops a cycle recursing forever.
 */
export function useTree(graph: Ref<Graph>, focus: Ref<string | null>, repeat: Ref<Repeat>) {
	/** Placements, not nodes: a node under two parents opens and closes separately in each */
	const expanded = reactive(new Set<string>());

	const fullPath = (id: string) => {
		const path = [id];
		for (let parent = graph.value.spanningParent(id); parent; parent = graph.value.spanningParent(parent))
			path.unshift(parent);
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
			const first = graph.value.spanningParent(id) === parent;
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
				hasChildren: children.length > 0,
				open
			});
			if (open) for (const child of children) visit([...path, child]);
		};
		for (const root of graph.value.roots) visit([root]);
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

	// A new dataset starts folded; an edit to the same one keeps what's open
	watch(
		() => graph.value.data.id,
		() => expanded.clear()
	);
	watch(focus, (id) => id && reveal(id), { immediate: true });

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
			for (const root of graph.value.roots) open([root]);
		},
		foldToFocus: () => {
			expanded.clear();
			if (focus.value) reveal(focus.value);
		},
		foldAll: () => expanded.clear()
	};
}
