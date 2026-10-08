/** Polyhierarchies to try in the browser. Steps may hold [links](url) and `code`. */
export interface Shot {
	/** Under public/ */
	src: string;
	alt: string;
	/** What to notice in it */
	caption: string;
	/** The point it illustrates; none for the one shown above the entry */
	point: number | null;
}

export interface PriorArtEntry {
	name: string;
	href: string;
	summary: string;
	/** What is interesting about it */
	points: string[];
	/** A walkthrough for someone who has never seen the site */
	steps: string[];
	shots?: Shot[];
}

export const sections: { title: string; about: string; entries: PriorArtEntry[] }[] = [
	{
		title: 'Notes and wikis',
		about: 'The friendliest place to start: everyday things filed under several headings at once.',
		entries: [
			{
				name: 'TheBrain',
				href: 'https://app.thebrain.com/brain/3d80058c-14d8-5361-0b61-a061f89baf87/2099a623-aa4f-24d4-26da-29bc310b84dd',
				summary: 'Jerry Michalski\'s public brain: over half a million thoughts, each drawn with everything it\'s linked to around it.',
				points: [
					'Only one step out is ever shown, so a node with six parents is as easy to read as one with one.',
					'Parents sit above, children below and siblings to the right. Siblings are never stored: they are just the other children of your parents.',
					'There is no "real" home for a thought. Tomatoes is filed under Berries and Vegetables at once, and neither wins.',
					'Moving around is just clicking: whatever you click slides into the middle and its own family gathers round it.'
				],
				steps: [
					'The link opens on the thought Tomatoes, outlined in red in the middle. Wait a few seconds for the lines to draw.',
					'Look above it. Those are its parents: Berries, Carotenoids, Climacteric (botany), Native Plants of the Americas, Nightshades (Solanaceae) and Vegetables. Botanically a berry, in the kitchen a vegetable: both are true, so both are parents.',
					'Look below it: its children, from Gazpacho and Ketchup to Tomato Sauce.',
					'Hover over Vegetables (above). The lines to its other children light up on the right: Asparagus, Artichokes, Avocados and so on. Those are the siblings Tomatoes has through Vegetables. Hover Berries and you get a different set.',
					'Click Tomato Sauce (below). It moves to the middle, and Tomatoes is now one of its four parents, next to Sauces, French Mother Sauces and Plum Tomatoes.',
					'Click a parent to climb back up. You can keep wandering like this: every click re-centres on a thought and shows its whole family.',
					'Switch the view with Plex, Tree and Cards at the top left. Tree shows the same thought as an indented list, which is where you can see how much the Plex is saving you.'
				],
				shots: [
					{
						src: 'prior-art/thebrain-1.jpg',
						alt: 'TheBrain\'s plex centred on the thought Tomatoes, with six parent thoughts above it (Berries, Carotenoids, Climacteric (botany), Native Plants of the Americas, Nightshades (Solanaceae) and Vegetables), dozens of children below and siblings down the right.',
						caption: 'Outlined: Tomatoes\' six parents, Berries and Vegetables among them, none of them the main one.',
						point: null
					},
					{
						src: 'prior-art/thebrain-2.jpg',
						alt: 'The same plex with the mouse over the parent Vegetables: lines from it light up to a group of thoughts on the right, including Allium, Artichokes, Asparagus and Avocados.',
						caption: 'Outlined: hovering the parent Vegetables lights up its other children on the right, which are Tomatoes\' siblings through it.',
						point: 1
					}
				]
			},
			{
				name: 'Wikipedia categories',
				href: 'https://en.wikipedia.org/wiki/Special:CategoryTree?target=Category%3ATomatoes&mode=parents&namespaces=',
				summary: 'Every Wikipedia page and category can sit in several categories, and there is a hidden tool that draws a category\'s parents as a tree.',
				points: [
					'Categories have as many parents as they need: Tomatoes is filed under Fruit vegetables and Edible fruits, among others.',
					'This view flips the usual tree upside down: instead of what is inside a category, it shows everything above it, all the way up.',
					'The same parent can turn up twice, because there are two routes up to it. That is the polyhierarchy showing itself.'
				],
				steps: [
					'The link opens Special:CategoryTree in parents mode for Tomatoes. The first line is Tomatoes; everything under it is a category Tomatoes belongs to.',
					'Ignore the maintenance ones, such as Commons category link is on Wikidata. Wikipedia uses categories for housekeeping too.',
					'Click the small arrow beside Fruit vegetables. Its own parents appear: Edible fruits and Vegetables.',
					'Now look further down: Edible fruits is also a direct parent of Tomatoes. So Tomatoes reaches Edible fruits two ways, directly and through Fruit vegetables, and the tree shows it twice.',
					'Keep clicking arrows to climb. You will soon reach very broad categories, which is the point: everything eventually joins up.',
					'To go the normal way, open [Category:Tomatoes](https://en.wikipedia.org/wiki/Category:Tomatoes). Its parents are listed in the Categories: bar at the very bottom of the page, and its subcategories, such as Tomato dishes, are at the top.'
				],
				shots: [
					{
						src: 'prior-art/wikipedia-1.jpg',
						alt: 'Special:CategoryTree in parents mode: Tomatoes at the top, and under it the categories it belongs to, from Fruit vegetables and Edible fruits to Solanum.',
						caption: 'Outlined: every category Tomatoes is filed in, drawn as a tree that grows upwards.',
						point: null
					},
					{
						src: 'prior-art/wikipedia-2.jpg',
						alt: 'The same tree with Fruit vegetables opened to show its own parents, Edible fruits and Vegetables. Edible fruits now appears twice: under Fruit vegetables, and directly under Tomatoes.',
						caption: 'Outlined: Edible fruits twice, because Tomatoes reaches it directly and through Fruit vegetables.',
						point: 2
					}
				]
			},
			{
				name: 'TiddlyWiki',
				href: 'https://tiddlywiki.com/',
				summary: 'A wiki that runs entirely in the page, where tags are parents and the site\'s own table of contents is built from them.',
				points: [
					'The contents are not written by hand. A note shows up under every tag it has, so giving it a second tag files it in a second place.',
					'It is the same note in both places, not a copy: open it from either and you land on the same page.',
					'The tags at the top of each note are its parents, and clicking one lists all of that tag\'s other children: its siblings.'
				],
				steps: [
					'On the right, under the search box, there are tabs: Contents, Open, Recent, Tools and More. Make sure Contents is selected.',
					'Welcome is already open in the list. Look down it and you will find GettingStarted.',
					'Further down, click the small arrow beside Working with TiddlyWiki to open it. GettingStarted is there as well.',
					'Click GettingStarted in either place. At the top of the note, under its title, are two blue tags: Welcome and Working with TiddlyWiki. Those two tags are why it shows up twice.',
					'Click one of the blue tags. A list drops down of every note with that tag: the other children of that parent.',
					'Community does the same trick at the top level: it is in the main list and also inside Welcome.'
				],
				shots: [
					{
						src: 'prior-art/tiddlywiki-1.jpg',
						alt: 'TiddlyWiki\'s sidebar Contents tab with Welcome and Working with TiddlyWiki both open; GettingStarted is listed under each.',
						caption: 'Outlined: GettingStarted in two places in the contents, because it has two tags.',
						point: null
					},
					{
						src: 'prior-art/tiddlywiki-2.jpg',
						alt: 'The GettingStarted note with its two blue tags, Welcome and Working with TiddlyWiki, under the title. The Welcome tag has been clicked, opening a list of every note tagged Welcome: HelloThere, Quick Start, Find Out More, TiddlyWiki on the Web, Testimonials and Reviews, GettingStarted and Community.',
						caption: 'Outlined: the note\'s two tags, its parents; clicking Welcome lists everything else under it.',
						point: 2
					}
				]
			},
			{
				name: 'Obsidian graph view',
				href: 'https://obsidian.md/help/plugins/graph',
				summary: 'Obsidian\'s help site is published with its own graph view, so you can play with it without installing anything.',
				points: [
					'There is no hierarchy at all: pages are dots and links are lines. A page linked from many others is just a bigger dot.',
					'The small graph beside every page is the local graph: only that page and what it links to. The big one is everything.',
					'The overall shape shows clusters, which pages live close together, which a tree can never show.'
				],
				steps: [
					'On the right of the page, under INTERACTIVE GRAPH, is a small graph. That is the local graph for the page you are reading: Graph view is the big dot, and around it are the pages it links to.',
					'Drag the graph to move it, and scroll over it to zoom in and out.',
					'Click any dot to go to that page. The small graph redraws around it, so you can walk from page to page by the graph alone.',
					'Click the small icon at the top right of the graph labelled Global Graph (three linked dots). The whole help site opens as one graph over the page.',
					'Notice the big dots: they are the pages most other pages link to. Zoom in on one cluster and you will find pages about the same thing sitting together, without anyone having filed them.',
					'Next to it, the arrow icon (Expand) shows the local graph full size instead.'
				],
				shots: [
					{
						src: 'prior-art/obsidian-1.jpg',
						alt: 'The global graph of Obsidian\'s help site: a few hundred grey dots joined by thin lines with no top or bottom, the dots of different sizes, each labelled with a page name.',
						caption: 'Outlined: the biggest dot, Settings, the page most others link to. Nothing is above anything else.',
						point: null
					},
					{
						src: 'prior-art/obsidian-2.jpg',
						alt: 'The Graph view help page, with the small INTERACTIVE GRAPH box in the right-hand column showing only this page and the dozen pages it links to.',
						caption: 'Outlined: the local graph beside the page, just this page and its links. The icons at its top right open the whole site.',
						point: 1
					}
				]
			}
		]
	},
	{
		title: 'Science vocabularies',
		about: 'Biology and medicine, where almost everything has several parents and the browsers have had decades to work out how to show it.',
		entries: [
			{
				name: 'QuickGO',
				href: 'https://www.ebi.ac.uk/QuickGO/term/GO:0005741',
				summary: 'One term at a time, with a chart of everything above it.',
				points: [
					'The ancestor chart draws every route from a term up to the top in one picture. Where two routes meet, the shared box is drawn once with several lines going into it, so nothing is repeated.',
					'Different kinds of parent are drawn differently: a black line means "is a" (a kind of), a blue line means "part of", and yellow, green and red lines mean "regulates". Each one is a different way of belonging.',
					'Most terms only look simple from the top. Something as well known as glycolysis turns out to belong to well over a dozen broader processes at once.'
				],
				steps: [
					'Open the link. It is the page for "mitochondrial outer membrane": the outer skin of a mitochondrion, the part of a cell that makes its energy. If a black cookie bar covers the bottom, click "I agree, dismiss this banner".',
					'In the menu on the left, click "Ancestor Chart". The pale yellow box at the bottom of the chart is the term you are on. Every box above it is something it belongs to, all the way up to "cellular component" at the top. Each box shows its ID (GO:…) in the coloured strip and its name underneath.',
					'Find the two black lines leaving the yellow box. One goes to "organelle outer membrane" (it is a kind of outer membrane on an organelle), the other to "mitochondrial membrane" (it is a kind of membrane of the mitochondrion). Those are its two parents, and neither is the main one.',
					'Follow each line up. From "organelle outer membrane" one route climbs through "outer membrane" to "membrane". From "mitochondrial membrane" a blue "part of" line goes to "mitochondrial envelope", and from there another to "mitochondrion". The routes cross and rejoin, and all of them end at "cellular anatomical structure". Notice that "organelle" is drawn once, with several lines arriving at it, rather than once per route.',
					'Check the key on the right of the chart to see what each line colour means.',
					'Click any box in the chart, for example "mitochondrion". It opens that term\'s own page, with its own ancestor chart. Use your browser\'s back button to return.',
					'For something much bigger, open glycolysis (GO:0006096) by typing it in the search box at the top. Under "Ancestor Chart", click the round icon with arrows next to the heading to open the chart in a large pop-up. Note how one everyday process fans out into a web of broader processes. Click "Close" when you are done.'
				],
				shots: [
					{
						src: 'prior-art/quickgo-1.jpg',
						alt: 'QuickGO ancestor chart for mitochondrial outer membrane: the pale yellow term at the bottom with lines rising through dozens of boxes to cellular component at the top, and a key of line colours on the right.',
						caption: 'The outlined yellow box is the term; its two outlined parents, organelle outer membrane and mitochondrial membrane, sit side by side with neither more important.',
						point: null
					},
					{
						src: 'prior-art/quickgo-2.jpg',
						alt: 'QuickGO ancestor chart for positive regulation of apoptotic process, with black, yellow and green lines, and the line-colour key outlined on the right.',
						caption: 'Match the line colours to the outlined key: black is "is a", yellow "regulates" and green "positively regulates", so one term belongs to its ancestors in different ways.',
						point: 1
					},
					{
						src: 'prior-art/quickgo-3.jpg',
						alt: 'QuickGO ancestor chart for glycolysis: a single yellow box at the bottom fanning out through about fifty broader processes, all converging on metabolic process near the top.',
						caption: 'From the outlined glycolysis at the bottom, routes fan out through dozens of broader processes before meeting again at the outlined metabolic process.',
						point: 2
					}
				]
			},
			{
				name: 'Ontology Lookup Service',
				href: 'https://www.ebi.ac.uk/ols4/ontologies/go/classes/http%253A%252F%252Fpurl.obolibrary.org%252Fobo%252FGO_0005741',
				summary: 'A browser for hundreds of science vocabularies, with a tree and a graph for every term.',
				points: [
					'Its tree is a normal folder-style tree, so to show a term with several parents it repeats the term under every route down to it. "Mitochondrial outer membrane" appears 18 times.',
					'Small "P" badges in the tree mark "part of" links, so the tree mixes "a kind of" and "a part of" in one outline and still tells them apart.',
					'The Graph tab is the opposite approach: the term once, in the middle, with its parents and its parts around it, one step out. Each kind of link has its own colour and can be switched on or off.'
				],
				steps: [
					'Open the link. It is the same term as in QuickGO, "mitochondrial outer membrane", so you can compare the two sites. If a cookie bar covers the bottom, click "I agree, dismiss this banner".',
					'Scroll down to the panel with the "Tree" and "Graph" buttons. "Tree" is already selected. The term is highlighted in blue, with the route down to it opened up: cellular_component, then cellular anatomical structure, then cytoplasm, mitochondrion, mitochondrial envelope, mitochondrial membrane, and finally mitochondrial outer membrane.',
					'Keep scrolling down the tree. The same term turns up again and again, each time at the end of a different route: through "intracellular anatomical structure", through "organelle envelope", through "membrane" and "organelle outer membrane", and so on. Every one of those is a true answer to "where does this belong?".',
					'Look at the small purple "P" badges beside some names. They mean "part of": a mitochondrial envelope is part of a mitochondrion, not a kind of one. Names without a badge are "a kind of" their parent.',
					'The grey number after each name is how many terms sit beneath it, which is why it shrinks as you go down. Untick "Show counts" on the right to hide them.',
					'On the right, choose "All classes" instead of "Preferred roots". The tree now starts from a more abstract top ("continuant") imported from another vocabulary, and the term appears over a hundred times. That is the cost of a tree for this kind of data.',
					'Click "Graph". At first only the term itself shows, in yellow. Under "Relationship Types", tick "subClassOf" (red, "is a kind of") and "part of" (orange). Two red arrows now point out to its two parents, and orange arrows come in from the things that are part of it.',
					'Click "Show All" to add every kind of link. Hover over a box to highlight it, and click a box to go to that term. A box with a small ⊕ has more to show.'
				],
				shots: [
					{
						src: 'prior-art/ols-1.jpg',
						alt: 'The OLS tree for the Gene Ontology, opened down to mitochondrial outer membrane, which appears three times in the visible part, each at the end of a different route.',
						caption: 'The same term, outlined, turns up at the end of three different routes in just the top of the tree: a folder-style tree has to repeat it for every parent.',
						point: null
					},
					{
						src: 'prior-art/ols-2.jpg',
						alt: 'The top of the OLS tree with purple P badges beside mitochondrion, mitochondrial envelope and mitochondrial membrane.',
						caption: 'The outlined P badges mark "part of" links; names without one, like cytoplasm, are "a kind of" their parent.',
						point: 1
					},
					{
						src: 'prior-art/ols-3.jpg',
						alt: 'The OLS Graph tab with subClassOf and part of ticked: mitochondrial outer membrane in yellow in the middle, red arrows out to its two parents and orange arrows in from three of its parts.',
						caption: 'The outlined yellow term appears once, with red arrows to its two outlined parents and orange arrows in from the things that are part of it.',
						point: 2
					}
				]
			},
			{
				name: 'MeSH Browser',
				href: 'https://meshb.nlm.nih.gov/record/ui?ui=D011024',
				summary: 'The US National Library of Medicine\'s subject headings, used to index every paper in PubMed.',
				points: [
					'A heading gets one tree number per place it sits, and the number spells out the route down to it: C01.748.610.763 is Infections › Respiratory Tract Infections › Pneumonia › Pneumonia, Viral.',
					'Several parents means several tree numbers. Viral pneumonia has four, under infections and under lung diseases.',
					'Its children come with it to every place: COVID-19 sits under each of the four, with its own number in each. That is a mirror, not a terminal duplicate.',
					'Because the address is the path, "everything under C08" is just a prefix, which is how PubMed widens a search to the narrower headings beneath one.'
				],
				steps: [
					'The link opens the record for Pneumonia, Viral on its Details tab. Find Tree Number(s): there are four codes, C01.748.610.763, C01.925.705, C08.381.677.807 and C08.730.610.763. Each is one place this heading lives.',
					'Read one as a path: every group of digits after a dot is one step further down. C01 is Infections, C01.925 is Virus Diseases, and C01.925.705 is Pneumonia, Viral under it.',
					'Click the MeSH Tree Structures tab. Now each of the four places is drawn as a small tree, ancestors above, the heading itself in bold among its siblings.',
					'Compare the first two trees. One reaches it through Respiratory Tract Infections › Pneumonia, the other straight through Virus Diseases. Both show COVID-19 underneath: the whole branch is repeated in each place.',
					'Keep scrolling and Pneumonia itself turns up under Infections (C01.748.610) and again under Respiratory Tract Diseases › Lung Diseases (C08.381.677). Parents can have several parents too.',
					'Click Tree View in the top menu to see the whole thing from the top: 16 branches, Anatomy [A] to Geographicals [Z]. Diseases [C] is where all of the above lives.'
				],
				shots: [
					{
						src: 'prior-art/mesh-1.jpg',
						alt: 'MeSH record for Pneumonia, Viral, with its four tree numbers C01.748.610.763, C01.925.705, C08.381.677.807 and C08.730.610.763 outlined',
						caption: 'One heading, four tree numbers (outlined): one for every place it sits in the tree.',
						point: null
					},
					{
						src: 'prior-art/mesh-2.jpg',
						alt: 'MeSH Tree Structures tab: Pneumonia, Viral under Respiratory Tract Infections › Pneumonia and again under Virus Diseases, with COVID-19 outlined beneath each',
						caption: 'COVID-19 (outlined) follows Pneumonia, Viral into each place, with its own number in each.',
						point: 2
					}
				]
			},
			{
				name: 'ICD-11 browser',
				href: 'https://icd.who.int/browse/2026-01/mms/en#1024154490',
				summary: 'The World Health Organization\'s classification of diseases, used to count causes of death and illness worldwide.',
				points: [
					'Two layers. Underneath is the Foundation, a polyhierarchy where a disease has as many parents as it needs. The version used for coding gives every disease exactly one home, so that nothing is counted twice in the statistics.',
					'The other parents are not thrown away: in the tree, a disease also appears in grey under its other parents, so you can find it wherever you would look for it.',
					'The code says where home is. A grey 1D65 under Pneumonia starts with 1, so it lives in chapter 01, infectious diseases.'
				],
				steps: [
					'The link opens CA40.1 Viral pneumonia. The tree on the left is opened down to it: 12 Diseases of the respiratory system › Lung infections › CA40 Pneumonia.',
					'Look further down the children of CA40 Pneumonia, after CA40.2 Fungal pneumonia. Four entries are grey: 1F57.2 Pulmonary toxoplasmosis due to Toxoplasma gondii, 1D65 Severe acute respiratory syndrome, KB24 Congenital pneumonia and CA43.1 Abscess of lung with pneumonia.',
					'Grey means "this belongs here too, but its home is somewhere else". Compare the codes with the black ones: those all start CA40, but 1D65 starts with 1 (chapter 01, infectious diseases) and KB24 with K (the newborn chapter).',
					'Click 1D65 Severe acute respiratory syndrome. The right-hand side shows one code, 1D65: when a doctor records SARS, it is counted once, in chapter 01, however many places it appears.',
					'Now see the polyhierarchy underneath. Open the same disease in the [Foundation](https://icd.who.int/browse/2026-01/foundation/en#652944603). Under Parent(s) it lists two, Certain zoonotic viral diseases and Pneumonia, as equals.',
					'In the Foundation tree on the left it is highlighted under Certain zoonotic viral diseases. Click the ⇒ next to Pneumonia under Parent(s) to jump to its other parent.'
				],
				shots: [
					{
						src: 'prior-art/icd11-1.jpg',
						alt: 'ICD-11 tree under CA40 Pneumonia, with four grey entries outlined: 1F57.2 Pulmonary toxoplasmosis, 1D65 Severe acute respiratory syndrome, KB24 Congenital pneumonia and CA43.1 Abscess of lung with pneumonia',
						caption: 'The grey entries (outlined) belong under Pneumonia too, but live somewhere else; their codes don\'t start CA40.',
						point: null
					},
					{
						src: 'prior-art/icd11-2.jpg',
						alt: 'ICD-11 with 1D65 Severe acute respiratory syndrome selected: the grey entry in the tree and its single code, 1D65, both outlined',
						caption: 'Click a grey entry and it has one code (outlined): 1D65 starts with 1, so its home is chapter 01 at the top of the tree.',
						point: 2
					},
					{
						src: 'prior-art/icd11-3.jpg',
						alt: 'ICD-11 Foundation page for Severe acute respiratory syndrome, with its Parent(s) box outlined listing Certain zoonotic viral diseases and Pneumonia',
						caption: 'In the Foundation underneath, the same disease has two parents (outlined), as equals.',
						point: 0
					}
				]
			},
			{
				name: 'SNOMED CT browser',
				href: 'https://snomedbrowser.org/?perspective=full&conceptId1=75570004&languages=en',
				summary: 'The official browser for SNOMED CT, the clinical terminology behind many health records.',
				points: [
					'Several parents is the norm here, with no primary one: viral pneumonia is both a kind of pneumonia and a kind of viral lower respiratory infection.',
					'Nobody files it under those two by hand. Each concept is defined by its properties (where in the body, what process, what cause), and a reasoner works out its parents from them. Add a new lung infection caused by a virus and it lands under the right parents by itself.',
					'The Stated and Inferred buttons show the difference: what the authors wrote, against what the reasoner worked out.'
				],
				steps: [
					'Click Accept on the licence agreement, and on the cookie banner if one appears.',
					'The right-hand side, Concept Details, opens on Summary. At the top, the Parents box lists two: Pneumonia (disorder) and Viral lower respiratory infection (disorder). Viral pneumonia is in the blue box below them, and its 15 children under that.',
					'The box beside the blue one is its definition: Finding site → Structure of parenchyma of lung, Associated morphology → Inflammatory morphology, Pathological process → Infectious process, Causative agent → Virus.',
					'Click Stated (top right of Concept Details, next to Inferred). The Parents box now says only Disease (disorder). That is all the authors wrote; the two real parents were worked out from the definition. Click Inferred to go back.',
					'Click the Diagram tab to see the same definition drawn: two lines with open arrowheads to the two parents, and four attribute boxes.',
					'Click the Taxonomy tab on the left: Viral pneumonia with both parents stacked above it and its children below. Use the Search tab next to it to look up anything else, three letters at least.'
				],
				shots: [
					{
						src: 'prior-art/snomed-1.jpg',
						alt: 'SNOMED CT browser Summary for Viral pneumonia, with the Parents box outlined listing Pneumonia (disorder) and Viral lower respiratory infection (disorder)',
						caption: 'Two parents (outlined), and neither is the main one.',
						point: null
					},
					{
						src: 'prior-art/snomed-3.jpg',
						alt: 'SNOMED CT browser Summary for Viral pneumonia, with its definition box outlined: finding site lung, inflammatory morphology, infectious process, causative agent virus',
						caption: 'The definition (outlined) is what decides the parents: lung, inflammation, infection, virus.',
						point: 1
					},
					{
						src: 'prior-art/snomed-2.jpg',
						alt: 'SNOMED CT browser in Stated view, with the Stated button and the Parents box outlined; the only parent listed is Disease (disorder)',
						caption: 'Switch to Stated (outlined) and the authors only wrote Disease: the two real parents were worked out by the reasoner.',
						point: 2
					}
				]
			}
		]
	},
	{
		title: 'Draw your own',
		about: 'Layout engines: give one a small graph with a node that has two parents, and a loop, and see how it copes.',
		entries: [
			{
				name: 'Graphviz Online',
				href: 'https://dreampuf.github.io/GraphvizOnline/',
				summary: 'Type a graph as text on the left and Graphviz draws it on the right as you type.',
				points: [
					'Graphviz\'s dot engine is the classic layered drawing: parents above, children below, a child centred under all its parents.',
					'A cycle has no top, so dot quietly turns one edge round to lay the rest out, then draws that edge pointing back up.',
					'Switching the engine to neato throws the layers away and lets the same graph float, which shows how much the layers were doing.'
				],
				steps: [
					'The example already loaded has a loop in it: the curved arrow from a3 back up to a0 is the edge that closes a cycle.',
					'Click into the text on the left, select it all (Ctrl+A, or Cmd+A on a Mac) and delete it.',
					'Type or paste: `digraph { Food -> Fruit; Food -> Vegetable; Fruit -> Apple; Fruit -> Tomato; Vegetable -> Tomato; Vegetable -> Carrot }`',
					'Tomato has two parents, Fruit and Vegetable, and dot places it in the middle underneath both, with an arrow from each. In a plain tree it would have to pick one.',
					'Add a loop: before the closing }, type `; Tomato -> Food`. The picture keeps its layers, and the new arrow runs straight back up from Tomato to Food.',
					'Change Engine (top of the right side) from dot to neato. The layers vanish and the nodes just spread out; it is no longer clear what is above what. Set it back to dot.'
				],
				shots: [
					{
						src: 'prior-art/graphviz-1.jpg',
						alt: 'Graphviz Online with the Food, Fruit, Vegetable graph typed on the left and drawn on the right; Tomato sits in the bottom row under both Fruit and Vegetable.',
						caption: 'Tomato, outlined, sits centred under both its parents, with an arrow from each.',
						point: null
					},
					{
						src: 'prior-art/graphviz-2.jpg',
						alt: 'The same graph with the line Tomato -> Food added; the new arrow runs straight up from Tomato to Food while the rows stay as they were.',
						caption: 'The outlined arrow closes the loop: dot draws it pointing back up, and every other node keeps its row.',
						point: 1
					},
					{
						src: 'prior-art/graphviz-3.jpg',
						alt: 'The same looped graph drawn with the neato engine: the nodes are scattered diagonally with no rows, and Tomato sits beside Food.',
						caption: 'With neato there are no rows, so the outlined Tomato and its parents no longer read top to bottom.',
						point: 2
					}
				]
			},
			{
				name: 'd3-dag',
				href: 'https://erikbrinkman.github.io/d3-dag/documents/examples.html?layout=sugiyama',
				summary: 'Layered layouts for graphs where a node can have several parents, with every setting in a dropdown.',
				points: [
					'A layered (Sugiyama) layout puts every node on a row below all of its parents, so a node with four parents still reads top to bottom like a tree.',
					'Long edges that skip rows are threaded between the nodes rather than over them.',
					'The settings show that the same graph can be drawn many ways: which row each node goes on, and the order along each row to cut crossings, are separate choices.'
				],
				steps: [
					'The page opens on a small example. Above the drawing is a row of dropdowns: Layout, Graph, Direction, Layering, Decross, Coord and Edges.',
					'Set Graph to "grafo (22 nodes)". Find node 7 near the bottom: it has four parents (21, 17, 20 and 3) and sits on a row below every one of them.',
					'Follow the long line from 21 down to 7. It skips several rows, and the layout leaves a lane for it instead of running it through other boxes.',
					'Set Decross to "opt" and watch the order along each row change to remove crossing lines. Then try "dfs", a quicker guess, and compare.',
					'Set Layering to "topological": every node gets a row of its own, so the drawing becomes very tall and thin. Set it back to "simplex", which packs rows tightly.',
					'Try Edges "curved" and Direction "LR" to see the same layout running left to right.'
				],
				shots: [
					{
						src: 'prior-art/d3-dag-1.jpg',
						alt: 'd3-dag\'s examples page showing the 22-node grafo graph in layers; node 7 is at the bottom with four incoming lines from nodes 21, 17, 20 and 3.',
						caption: 'Node 7, outlined, has four parents and sits on a row below every one of them.',
						point: null
					},
					{
						src: 'prior-art/d3-dag-2.jpg',
						alt: 'The same layout with the line from node 21 down to node 7 outlined; it runs down the right-hand side past several rows without crossing any box.',
						caption: 'The outlined line from 21 to 7 skips four rows and is threaded down a lane of its own.',
						point: 1
					},
					{
						src: 'prior-art/d3-dag-3.jpg',
						alt: 'The same graph with Layering set to topological: each node has a row of its own, so the drawing is a tall thin column of boxes and long vertical lines.',
						caption: 'Change only the outlined Layering setting and the same graph turns into a tall column, one node per row.',
						point: 2
					}
				]
			}
		]
	}
];
