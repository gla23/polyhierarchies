import { datasets, edit, type Polyhierarchy } from '@polyhierarchies/core';
import type { GraphEditor } from '@polyhierarchies/ui';
import { reactive } from 'vue';

const storageKey = (id: string) => `polyhierarchies:dataset:${id}`;

function saved(id: string): Polyhierarchy | null {
	try {
		const json = localStorage.getItem(storageKey(id));
		return json ? JSON.parse(json) : null;
	} catch {
		return null;
	}
}

const originals = new Map(datasets.map((data) => [data.id, data]));

/** Every dataset as it currently stands: the original, or the edited copy kept in localStorage */
export const current = reactive(
	Object.fromEntries(datasets.map((data) => [data.id, saved(data.id) ?? data]))
) as Record<string, Polyhierarchy>;

export const isEdited = (id: string) => current[id] !== originals.get(id);

function change(id: string, apply: (data: Polyhierarchy) => Polyhierarchy) {
	current[id] = apply(current[id]!);
	try {
		localStorage.setItem(storageKey(id), JSON.stringify(current[id]));
	} catch {
		// Storage full or refused: the edit still holds for this visit
	}
}

export function reset(id: string) {
	current[id] = originals.get(id)!;
	try {
		localStorage.removeItem(storageKey(id));
	} catch {
		// Nothing was stored, then
	}
}

/** The editor the UIs are handed, writing to the dataset `id` */
export function editorFor(id: string, open: (node: string) => void): GraphEditor {
	return {
		update: (node, patch) => change(id, (data) => edit.updateNode(data, node, patch)),
		add(parent, label = 'New node') {
			let added = '';
			change(id, (data) => {
				const result = edit.addNode(data, label, parent);
				added = result.id;
				return result.data;
			});
			return added;
		},
		remove: (node) => change(id, (data) => edit.removeNode(data, node)),
		link: (parent, child) => change(id, (data) => edit.link(data, parent, child)),
		unlink: (parent, child) => change(id, (data) => edit.unlink(data, parent, child)),
		move: (child, from, to, index) => change(id, (data) => edit.move(data, child, from, to, index)),
		jump: (a, b) => change(id, (data) => edit.addJump(data, a, b)),
		unjump: (a, b) => change(id, (data) => edit.removeJump(data, a, b)),
		open
	};
}
