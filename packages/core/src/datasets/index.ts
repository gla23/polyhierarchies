import { animals } from './animals';
import { challengesForKids } from './challengesForKids';
import { food } from './food';
import { foodWeb } from './foodWeb';
import { generated } from './generated';
import { medicine } from './medicine';
import { tasks } from './tasks';

/** Simplest first, so the list reads as a ladder of difficulty */
export const datasets = [
	animals,
	tasks,
	food,
	challengesForKids,
	medicine,
	foodWeb,
	generated(300),
	generated(2000, { seed: 7, backLinks: 40 })
];
