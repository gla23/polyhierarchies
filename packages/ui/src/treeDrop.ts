import type { Graph } from '@polyhierarchies/core';
import { ref, type Ref } from 'vue';
import type { GraphEditor } from './editing';
import type { TreeRow } from './tree';

export type DropZone = 'before' | 'inside' | 'after';

/**
 * Drag a placement by its handle and drop it on another row: its top or bottom quarter puts it
 * before or after that placement, among the same parent's children; the middle half puts it inside,
 * as a child. Alt links instead of moving — the node gains a parent and keeps the one it had, the
 * polyhierarchy's own gesture, as Alt-drag copies a file.
 */
export function useTreeDrop(
	graph: Ref<Graph>,
	editor: Ref<GraphEditor | undefined>,
	onDropInside: (row: TreeRow) => void
) {
	const dragging = ref<TreeRow | null>(null);
	const target = ref<{ key: string; zone: DropZone } | null>(null);

	/** The node just dropped, for its row to flash where it landed */
	const landed = ref<string | null>(null);
	let landedTimer: ReturnType<typeof setTimeout> | undefined;

	function start(event: DragEvent, row: TreeRow) {
		dragging.value = row;
		const transfer = event.dataTransfer;
		if (!transfer) return;
		// Firefox won't start a drag without data
		transfer.setData('text/plain', graph.value.label(row.id));
		transfer.effectAllowed = 'copyMove';
		// The whole row as the ghost, not just the handle being held
		const handle = event.currentTarget as HTMLElement;
		const rowElement = handle.closest<HTMLElement>('.row');
		if (rowElement) {
			const rowRect = rowElement.getBoundingClientRect();
			transfer.setDragImage(rowElement, event.clientX - rowRect.left, event.clientY - rowRect.top);
		}
	}

	function over(event: DragEvent, row: TreeRow) {
		if (!dragging.value || row.key === dragging.value.key) return;
		event.preventDefault();
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const at = (event.clientY - rect.top) / rect.height;
		target.value = { key: row.key, zone: at < 0.25 ? 'before' : at > 0.75 ? 'after' : 'inside' };
		if (event.dataTransfer) event.dataTransfer.dropEffect = event.altKey ? 'copy' : 'move';
	}

	function drop(event: DragEvent, row: TreeRow) {
		const dragged = dragging.value;
		const zone = target.value?.zone;
		end();
		if (!dragged || !zone || !editor.value || row.key === dragged.key) return;
		event.preventDefault();

		const parent = zone === 'inside' ? row.id : row.parent;
		if (event.altKey) {
			if (parent) editor.value.link(parent, dragged.id);
		} else {
			const others = parent ? graph.value.children(parent).filter((id) => id !== dragged.id) : [];
			const index =
				zone === 'inside' ? others.length : others.indexOf(row.id) + (zone === 'after' ? 1 : 0);
			editor.value.move(dragged.id, dragged.parent, parent, index);
		}
		if (zone === 'inside') onDropInside(row);
		landed.value = dragged.id;
		clearTimeout(landedTimer);
		landedTimer = setTimeout(() => (landed.value = null), 900);
	}

	function end() {
		dragging.value = null;
		target.value = null;
	}

	const zoneOf = (row: TreeRow) => (target.value?.key === row.key ? target.value.zone : null);

	return { dragging, landed, start, over, drop, end, zoneOf };
}
