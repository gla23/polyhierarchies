import { fromOutline } from '../outline';

export const food = fromOutline(
	{
		id: 'food',
		start: 'tomato',
		name: 'Food',
		description:
			'The classic polyhierarchy: botany and the kitchen disagree, so a tomato is a fruit, a vegetable and a salad ingredient at once, and a peanut is both a nut and a legume.',
		columns: [
			{ key: 'calories', label: 'kcal / 100 g', type: 'number' },
			{ key: 'botanicalFruit', label: 'Botanical fruit', type: 'boolean' }
		]
	},
	`
Food
  Fruit
    Apple
    Banana
    Tomato
    Cucumber
    Pumpkin
    Avocado
    Olive
  Vegetable
    Carrot
    Tomato
    Cucumber
    Pumpkin
  Nuts
    Walnut
    Almond
    Peanut
  Legumes
    Lentil
    Chickpea
    Peanut
  Fats
    Avocado
    Olive
    Walnut
  Salad
    Tomato
    Cucumber
    Avocado
    Olive
---
Cucumber ~ Pumpkin
Chickpea ~ Olive
`,
	{
		Food: { icon: 'restaurant' },
		Fruit: { icon: 'lucide:apple', colour: '#e05d5d' },
		Vegetable: { icon: 'lucide:carrot', colour: '#f28c28' },
		Nuts: { icon: 'lucide:nut', colour: '#a0703c' },
		Legumes: { icon: 'lucide:bean', colour: '#8bb34a' },
		Fats: { icon: 'lucide:droplet', colour: '#e6c229' },
		Salad: { icon: 'lucide:salad', colour: '#4caf50' },
		Apple: { colour: '#e05d5d', fields: { calories: 52, botanicalFruit: true } },
		Banana: { icon: 'lucide:banana', colour: '#f4d03f', fields: { calories: 89, botanicalFruit: true } },
		Tomato: { colour: '#e53935', fields: { calories: 18, botanicalFruit: true } },
		Cucumber: { colour: '#66bb6a', fields: { calories: 15, botanicalFruit: true } },
		Pumpkin: { colour: '#fb8c00', fields: { calories: 26, botanicalFruit: true } },
		Avocado: { colour: '#689f38', fields: { calories: 160, botanicalFruit: true } },
		Olive: { colour: '#827717', fields: { calories: 115, botanicalFruit: true } },
		Carrot: { icon: 'lucide:carrot', colour: '#f28c28', fields: { calories: 41, botanicalFruit: false } },
		Walnut: { fields: { calories: 654, botanicalFruit: false } },
		Almond: { fields: { calories: 579, botanicalFruit: false } },
		Peanut: { fields: { calories: 567, botanicalFruit: false } },
		Lentil: { fields: { calories: 116, botanicalFruit: false } },
		Chickpea: { fields: { calories: 164, botanicalFruit: false } }
	}
);
