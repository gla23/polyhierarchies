<template>
	<article class="page">
		<h1>Primary parents?</h1>
		<p class="lede">
			When an item has several parents, do UIs pick one as its main home and treat the rest as
			secondary?
		</p>

		<h2>Short answer: it depends on the shape of the UI</h2>
		<p>
			UIs that have to put each item in <em>one place</em> — an outline, a breadcrumb, a URL, a file
			path — nearly always end up with a primary parent, either stored or falling out of the order
			they render in. UIs that <em>show the graph</em> — ontology browsers, TheBrain, layered DAG
			layouts — don't: all parents are equal, and an item just has several.
		</p>

		<h2>The problem</h2>
		<p>
			A tree gives every node one place. A polyhierarchy gives it several, and a cycle gives it
			infinitely many. A tree-shaped UI has four ways out:
		</p>
		<ol>
			<li>
				<strong>Repeat the whole subtree in every place.</strong> Honest, but it multiplies — and a
				cycle never finishes unless it stops where a node would repeat inside its own path. The
				Outline's <em>Mirrors</em> option, and Workflowy's mirrors.
			</li>
			<li>
				<strong>Render each node in full once, and repeat it elsewhere as a terminal
				duplicate.</strong>
				What the Outline here does. "Once" means the first time it's reached, so the primary parent is
				implicit: it falls out of the order the data happens to be in, and needs no extra data.
			</li>
			<li>
				<strong>Store a primary parent</strong> (an owner, a home) and show the others as references
				to it. The primary is now a decision someone made, which is what makes it stable enough for
				breadcrumbs and URLs.
			</li>
			<li>
				<strong>Stop being a tree</strong>: show a neighbourhood (the Plex) or the whole graph (the
				Force graph), where no placement is special.
			</li>
		</ol>

		<h2>Parents as equals</h2>
		<ul>
			<li>
				<strong>SNOMED CT</strong> is a polyhierarchy by design: a concept has as many "is a" parents
				as it needs, with no primary one
				(<a href="https://docs.snomed.org/snomed-international-documents/snomed-ct-glossary/p/polyhierarchy">glossary</a>).
				Its browsers simply list parents and children:
				<a href="https://snomedbrowser.org/?perspective=full&conceptId1=75570004&edition=MAIN/2026-09-01&release=&languages=en">SNOMED browser</a>,
				and
				<a href="https://ontoserver.csiro.au/shrimp/?concept=75570004&version=http%3A%2F%2Fsnomed.info%2Fsct%2F32506021000036107%2Fversion%2F20260831&valueset=http%3A%2F%2Fsnomed.info%2Fsct%2F32506021000036107%3Ffhir_vs&fhir=https%3A%2F%2Ftx.ontoserver.csiro.au%2Ffhir&tour=true">Shrimp</a>
				for comparison.
			</li>
			<li>
				<strong>TheBrain</strong> draws parents above, children below, jumps to the left and siblings
				to the right. Siblings aren't stored: they're derived from shared parents. By default it shows
				one step out; an "Expanded" view adds grandparents and grandchildren
				(<a href="http://assets.thebrain.com/documents/TheBrain8-UserGuide.pdf">user guide</a>,
				<a href="http://old.thebrain.com/support/tutorials/changing-relationships/distant-thoughts/">distant thoughts</a>).
				Jerry Michalski's public Brain shows how far that goes:
				<a href="https://app.thebrain.com/brain/3d80058c-14d8-5361-0b61-a061f89baf87/0ce15be3-e22b-dc83-6648-7b9066005eab">a crowded page</a>,
				and
				<a href="https://app.thebrain.com/brain/3d80058c-14d8-5361-0b61-a061f89baf87/a31bd7b8-e87c-76d4-91ee-1fb734307c0b">Carrot Flute</a>,
				with its siblings running down one side. The Plex here is modelled on it.
			</li>
			<li>
				<strong>d3-dag</strong> lays a DAG out in layers, Mermaid-style, with every node once and
				every edge drawn; its
				<a href="https://erikbrinkman.github.io/d3-dag/documents/dagre.html">settings</a>
				show how much the layout choices change the reading.
			</li>
			<li>
				<strong>Obsidian's local graph</strong> shows a note's neighbourhood to a chosen depth, one to
				five links out (<a href="https://obsidian.md/help/plugins/graph">help</a>). Depth that adapts
				to how crowded the neighbourhood is — what the Plex's budget does — is still an
				<a href="https://forum.obsidian.md/t/the-local-graph-to-change-depth-automatically-based-on-the-connections-a-node-has/61573">open request</a>.
			</li>
		</ul>

		<h2>Parents as equals, when editing</h2>
		<ul>
			<li>
				<strong>Workflowy</strong>'s
				<a href="https://workflowy.com/feature/mirrors/">mirrors</a> put the same item in several
				places, every copy live and identical, with a small mark saying it lives elsewhere. The
				Outline's <em>Mirrors</em> option draws placements that way.
			</li>
			<li>
				<strong>Logseq</strong> and <strong>Roam</strong> do it with block references and embeds, and
				a backlinks panel that is in effect the list of a block's parents.
			</li>
		</ul>

		<h2>A primary parent</h2>
		<ul>
			<li>
				<strong>Tana</strong> gives every node one <em>owner</em>, where it was created, and any
				number of parents it appears under as a reference, and supertags give it several types on
				top of its several parents. Ownership can be moved: "Bring referenced
				node here" makes a reference the original
				(<a href="https://tana.inc/docs/nodes-and-references">nodes and references</a>).
			</li>
			<li>
				<strong>Yoast SEO</strong> lets a WordPress post or product in several categories pick a
				<em>primary category</em>, which decides its breadcrumb and URL
				(<a href="https://yoast.com/help/how-to-select-a-primary-category/">how to</a>).
			</li>
			<li>
				<strong>File systems</strong>: a file has one real path, and shortcuts or symlinks elsewhere.
			</li>
		</ul>

		<h2>So, for exploring</h2>
		<p>
			All parents equal is the simpler model, and the one every UI here starts from. A primary parent
			is a layer on top — worth adding when something needs one place to be stable (a breadcrumb, a
			URL, a canonical page), and worth comparing against the implicit "first reached" one the
			Outline already gets for free.
		</p>
	</article>
</template>

<style scoped>
.page {
	max-width: 720px;
	margin: 0 auto;
	padding: 32px 24px 64px;
	line-height: 1.6;
}

h1 {
	margin: 0 0 8px;
	font-size: 26px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.lede {
	font-size: 16px;
	color: var(--theme--foreground-subdued);
}

h2 {
	margin: 32px 0 8px;
	font-size: 17px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

li + li {
	margin-top: 10px;
}

strong {
	color: var(--theme--foreground-accent);
	font-weight: 600;
}

a {
	color: var(--theme--primary);
}
</style>
