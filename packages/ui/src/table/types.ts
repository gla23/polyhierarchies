export type Alignment = 'left' | 'center' | 'right';

export interface HeaderRaw {
	text: string;
	value: string;
	description?: string | null;
	align?: Alignment;
	sortable?: boolean;
	width?: number | null;
	[key: string]: any;
}

export type Header = Required<HeaderRaw>;

export interface Item {
	[key: string]: any;
}

export interface ItemSelectEvent {
	value: boolean;
	item: Item;
}

export interface Sort {
	by: string | null;
	desc: boolean;
}

/** As Directus's own: a row's checkbox, a radio for picking one, or neither */
export type ShowSelect = 'none' | 'one' | 'multiple';

export type PrimaryKey = string | number;
