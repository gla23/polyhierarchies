import { fromOutline } from '../outline';

export const foodWeb = fromOutline(
	{
		id: 'food-web',
		start: 'grass',
		name: 'Food web (cyclic)',
		description:
			'"Becomes food for" is a hierarchy until it loops. Grass → Rabbit → Fox → Decomposers → Soil → Grass: what the decomposers leave feeds the grass again (and the grass and rabbit also feed the decomposers directly). Chicken → Egg → Chicken has no root at all, so the chicken is picked as the way in.',
		columns: [{ key: 'role', label: 'Role', type: 'text' }]
	},
	`
Sun
  Grass
    Rabbit
      Fox
        Decomposers
    Decomposers
Rabbit
  Decomposers
Decomposers
  Soil
    Grass
Chicken
  Egg
    Chicken
---
Fox ~ Chicken
`,
	{
		Sun: { icon: 'lucide:sun', colour: '#f9a825', fields: { role: 'Energy' } },
		Grass: { icon: 'grass', colour: '#7cb342', fields: { role: 'Producer' } },
		Rabbit: { icon: 'lucide:rabbit', colour: '#bcaaa4', fields: { role: 'Herbivore' } },
		Fox: { icon: 'lucide:squirrel', colour: '#e65100', fields: { role: 'Predator' } },
		Decomposers: { icon: 'compost', colour: '#795548', fields: { role: 'Decomposer' } },
		Soil: { icon: 'lucide:layers', colour: '#8d6e63', fields: { role: 'Nutrients' } },
		Chicken: { icon: 'lucide:bird', colour: '#fdd835', fields: { role: 'Omnivore' } },
		Egg: { icon: 'lucide:egg', colour: '#fff3e0', fields: { role: 'Offspring' } }
	}
);
