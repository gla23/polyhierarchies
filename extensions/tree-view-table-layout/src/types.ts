// CORE CLONE
export interface LayoutOptions {
	widths?: {
		[field: string]: number;
	};
	align?: {
		[field: string]: 'left' | 'center' | 'right';
	};
	limit?: number;
	spacing?: 'comfortable' | 'cozy' | 'compact';
	parent?: string | null;
	/** How many columns, from the first, move with the hierarchy */
	shiftedColumns?: number;
}

export interface LayoutQuery {
	fields: string[];
	sort: string[];
	page: number;
	limit: number;
}
