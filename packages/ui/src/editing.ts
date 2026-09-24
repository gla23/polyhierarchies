import type { PolyNode } from '@polyhierarchies/core';

/**
 * Handed to a UI to make it editable; a UI given none is read only. Every method is one change to
 * the dataset, so the UIs only decide which gesture means which change.
 */
export interface GraphEditor {
	update(id: string, patch: Partial<Omit<PolyNode, 'id'>>): void;
	/** Creates a node under `parent` (null for the top level) and returns its id */
	add(parent: string | null, label?: string): string;
	remove(id: string): void;
	link(parent: string, child: string): void;
	unlink(parent: string, child: string): void;
	/** Moves one placement: from under `from` to `index` among `to`'s other children */
	move(child: string, from: string | null, to: string | null, index: number): void;
	jump(a: string, b: string): void;
	unjump(a: string, b: string): void;
	/** Opens the node's editor — the Directus item page, standalone a modal */
	open(id: string): void;
}

export type Density = 'compact' | 'cosy' | 'comfortable';

export type Motion = 'auto' | 'on' | 'off';

/**
 * Whether to animate `count` things. Auto stops at the UI's own `limit`: past it, measuring every
 * element for a move costs more frames than the motion is worth.
 */
export const animates = (motion: Motion, count: number, limit: number) =>
	motion === 'on' || (motion === 'auto' && count <= limit);

/** Directus's three table densities, as the spacing every UI sizes its nodes and rows from */
export const densityStyles: Record<Density, Record<string, string>> = {
	compact: { '--row-height': '32px', '--node-padding-y': '2px', '--row-gap': '0px' },
	cosy: { '--row-height': '48px', '--node-padding-y': '4px', '--row-gap': '2px' },
	comfortable: { '--row-height': '64px', '--node-padding-y': '8px', '--row-gap': '6px' }
};
