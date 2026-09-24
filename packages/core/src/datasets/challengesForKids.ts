import { fromOutline } from '../outline';

/** Abridged from the thought of the same name in Jerry Michalski's public Brain */
export const challengesForKids = fromOutline(
	{
		id: 'challenges-for-kids',
		start: 'challenges-for-kids',
		name: 'Challenges for Kids',
		description:
			"A TheBrain map: one thought with six parents, jumps off to the side, and a crowd of siblings reached only through those parents. Focus 'Challenges for Kids' to see it the way TheBrain draws it.",
		columns: [{ key: 'site', label: 'Website', type: 'text' }]
	},
	`
Kids
  Challenges for Kids
    Adafruit Learning System
    BigShot
    Circuit Scribe
    Coding Programs for Kids
    Construction Sets
    99 Bricks
    Belly Button Biodiversity
  Aha! Jokes for Kids
  Letting Kids Do Dangerous Things
Challenges
  Challenges for Kids
  Challenge and Stunt Shows
  Challenge Sites
Unschooling
  Challenges for Kids
  Articles About Unschooling
  Big Questions
Children's Resources
  Challenges for Kids
  Children's Museums
  Children as Philosophers
Cool Stuff
  Challenges for Kids
  Circuit Scribe
  Belly Button Biodiversity
Good Starting Points
  Challenges for Kids
  Kids
Big Questions
  Big Questions I Love to Answer
  Children as Philosophers
---
Challenges for Kids ~ Free Range Kids
Challenges for Kids ~ Fun for Kids
Challenges for Kids ~ Gifts for Kids
Free Range Kids ~ Letting Kids Do Dangerous Things
`,
	{
		'Challenges for Kids': { icon: 'lucide:trophy', colour: '#f5c518' },
		Kids: { icon: 'child_care', colour: '#e9a0c8' },
		Unschooling: { icon: 'lucide:graduation-cap', colour: '#f5c518' },
		'Cool Stuff': { icon: 'lucide:sparkles' },
		'Big Questions': { icon: 'lucide:circle-help', colour: '#f5c518' },
		'Adafruit Learning System': { fields: { site: 'learn.adafruit.com' } },
		BigShot: { icon: 'lucide:camera', fields: { site: 'bigshotcamera.com' } },
		'Circuit Scribe': { icon: 'lucide:pen-tool', fields: { site: 'circuitscribe.com' } },
		'99 Bricks': { icon: 'lucide:blocks' },
		'Belly Button Biodiversity': { icon: 'lucide:microscope' },
		'Free Range Kids': { icon: 'lucide:tent', fields: { site: 'freerangekids.com' } }
	}
);
