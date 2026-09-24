import { fromOutline } from '../outline';

export const animals = fromOutline(
	{
		id: 'animals',
		start: 'mammals',
		name: 'Animals (a plain tree)',
		description:
			'For contrast: one parent each, no jumps. Every UI should fall back to the ordinary tree it would be without polyhierarchy support.',
		columns: [
			{ key: 'legs', label: 'Legs', type: 'number' },
			{ key: 'habitat', label: 'Habitat', type: 'text' }
		]
	},
	`
Animals
  Vertebrates
    Mammals
      Cats
      Dogs
      Whales
    Birds
      Eagles
      Penguins
    Fish
      Sharks
      Salmon
  Invertebrates
    Insects
      Bees
      Beetles
    Molluscs
      Octopuses
      Snails
`,
	{
		Animals: { icon: 'pets' },
		Mammals: { icon: 'lucide:paw-print', colour: '#c58b5a' },
		Cats: { icon: 'lucide:cat', fields: { legs: 4, habitat: 'Homes' } },
		Dogs: { icon: 'lucide:dog', fields: { legs: 4, habitat: 'Homes' } },
		Whales: { fields: { legs: 0, habitat: 'Ocean' } },
		Birds: { icon: 'lucide:bird', colour: '#4aa3df' },
		Eagles: { fields: { legs: 2, habitat: 'Mountains' } },
		Penguins: { fields: { legs: 2, habitat: 'Antarctic' } },
		Fish: { icon: 'lucide:fish', colour: '#3fb8af' },
		Sharks: { fields: { legs: 0, habitat: 'Ocean' } },
		Salmon: { fields: { legs: 0, habitat: 'Rivers' } },
		Insects: { icon: 'lucide:bug', colour: '#9bc53d' },
		Bees: { fields: { legs: 6, habitat: 'Meadows' } },
		Beetles: { fields: { legs: 6, habitat: 'Everywhere' } },
		Molluscs: { icon: 'lucide:shell', colour: '#d67ab1' },
		Octopuses: { fields: { legs: 8, habitat: 'Ocean' } },
		Snails: { icon: 'lucide:snail', fields: { legs: 0, habitat: 'Gardens' } }
	}
);
