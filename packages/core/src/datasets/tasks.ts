import { fromOutline } from '../outline';

export const tasks = fromOutline(
	{
		id: 'tasks',
		start: 'fix-bike',
		name: 'Tasks',
		description:
			"A to-do list's case: a job belongs to a project, a context and a time all at once, and wants to turn up in each. Fixing the bike is a repair, an errand and an outdoor job.",
		columns: [
			{ key: 'due', label: 'Due', type: 'text' },
			{ key: 'effort', label: 'Effort (h)', type: 'number' },
			{ key: 'done', label: 'Done', type: 'boolean' }
		]
	},
	`
Home
  Garden
    Mow lawn
    Plant bulbs
  Repairs
    Fix bike
    Replace fence panel
Errands
  Buy seeds
  Fix bike
  Return library books
Outdoors
  Mow lawn
  Plant bulbs
  Fix bike
  Replace fence panel
Weekend
  Replace fence panel
  Plant bulbs
Garden
  Buy seeds
---
Buy seeds ~ Plant bulbs
`,
	{
		Home: { icon: 'home', colour: '#6c8ebf' },
		Garden: { icon: 'lucide:sprout', colour: '#7cb342' },
		Repairs: { icon: 'lucide:wrench', colour: '#e0a030' },
		Errands: { icon: 'lucide:shopping-cart', colour: '#d9534f' },
		Outdoors: { icon: 'lucide:trees', colour: '#43a047' },
		Weekend: { icon: 'lucide:calendar', colour: '#8e7cc3' },
		'Mow lawn': { fields: { due: 'Sat', effort: 1, done: false } },
		'Plant bulbs': { fields: { due: 'Sun', effort: 2, done: false } },
		'Fix bike': { icon: 'lucide:bike', fields: { due: 'Fri', effort: 1.5, done: false } },
		'Replace fence panel': { icon: 'lucide:fence', fields: { due: 'Sat', effort: 3, done: false } },
		'Buy seeds': { fields: { due: 'Thu', effort: 0.5, done: true } },
		'Return library books': { icon: 'lucide:book', fields: { due: 'Mon', effort: 0.5, done: true } }
	}
);
