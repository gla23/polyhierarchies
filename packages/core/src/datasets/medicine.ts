import { fromOutline } from '../outline';

/** Simplified from SNOMED CT's "is a" hierarchy around Viral pneumonia (75570004) */
export const medicine = fromOutline(
	{
		id: 'medicine',
		start: 'viral-pneumonia',
		name: 'Medicine (SNOMED-style)',
		description:
			"A slice of a clinical terminology, where polyhierarchy is the whole point: a disorder is classified by what causes it, where it is and what it does, all at once, so Viral pneumonia is a viral infection, a lung disorder and an inflammation. Simplified from SNOMED CT's is-a hierarchy, and not a clinical reference.",
		columns: [{ key: 'sctid', label: 'SNOMED CT id', type: 'text' }]
	},
	`
Clinical finding
  Disease
    Infectious disease
      Viral disease
        Viral respiratory infection
          Viral lower respiratory infection
            Viral pneumonia
          Influenza
          COVID-19
      Bacterial infectious disease
        Bacterial pneumonia
          Pneumococcal pneumonia
      Lower respiratory tract infection
        Viral lower respiratory infection
        Infective pneumonia
          Viral pneumonia
          Bacterial pneumonia
    Disorder of respiratory system
      Disorder of lower respiratory system
        Lower respiratory tract infection
        Disorder of lung
          Pneumonia
            Infective pneumonia
          Asthma
    Inflammatory disorder
      Pneumonia
      Asthma
`,
	{
		'Clinical finding': { icon: 'stethoscope', fields: { sctid: '404684003' } },
		Disease: { icon: 'lucide:activity', fields: { sctid: '64572001' } },
		'Infectious disease': { icon: 'lucide:biohazard', colour: '#e57373' },
		'Viral disease': { icon: 'coronavirus', colour: '#ba68c8' },
		'Bacterial infectious disease': { icon: 'lucide:bug', colour: '#81c784' },
		'Disorder of respiratory system': { icon: 'pulmonology', colour: '#64b5f6' },
		'Inflammatory disorder': { icon: 'lucide:flame', colour: '#ffb74d' },
		Pneumonia: { fields: { sctid: '233604007' } },
		'Viral pneumonia': { colour: '#ba68c8', fields: { sctid: '75570004' } },
		'Bacterial pneumonia': { colour: '#81c784', fields: { sctid: '53084003' } },
		Asthma: { fields: { sctid: '195967001' } },
		Influenza: { fields: { sctid: '6142004' } },
		'COVID-19': { fields: { sctid: '840539006' } }
	}
);
