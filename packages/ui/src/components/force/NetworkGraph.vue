<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import * as d3 from 'd3';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { animates, type Density, type GraphEditor, type Motion } from '../../editing';

/** Obsidian's graph view: dots left to float, sized by how connected they are, with no up or down */
const props = withDefaults(
	defineProps<{
		graph: Graph;
		editor?: GraphEditor;
		density?: Density;
		motion?: Motion;
		scope?: 'all' | 'local';
		depth?: number;
	}>(),
	{ density: 'cosy', motion: 'auto', scope: 'all', depth: 2 }
);
const focus = defineModel<string | null>('focus', { default: null });

const spacing: Record<Density, number> = { compact: 40, cosy: 60, comfortable: 85 };

/** Where each node was, so a redraw keeps the picture and only what's new has to settle */
const positions = new Map<string, { x: number; y: number }>();

interface SimNode extends d3.SimulationNodeDatum {
	id: string;
	label: string;
	colour?: string;
	radius: number;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	jump: boolean;
}

const width = 1000;
const height = 600;

const svgElement = ref<SVGSVGElement>();
let simulation: d3.Simulation<SimNode, SimLink> | undefined;
let neighbours = new Map<string, Set<string>>();

/** Every link at once, parents, children and jumps alike: the view has no direction */
const linked = (id: string) => [
	...props.graph.parents(id),
	...props.graph.children(id),
	...props.graph.jumps(id)
];

/** Obsidian's local graph: the focus and whatever is within `depth` links of it, any direction */
function shown(): Set<string> {
	const all = props.graph.data.nodes.map((node) => node.id);
	if (props.scope === 'all' || !focus.value) return new Set(all);
	const seen = new Set([focus.value]);
	let frontier = [focus.value];
	for (let step = 0; step < props.depth && frontier.length; step++) {
		frontier = [...new Set(frontier.flatMap(linked))].filter((id) => !seen.has(id));
		frontier.forEach((id) => seen.add(id));
	}
	return seen;
}

function draw() {
	simulation?.stop();
	const { graph, editor } = props;
	const gap = spacing[props.density];
	const svg = d3.select(svgElement.value!);
	svg.selectAll('*').remove();
	// Taken before the zoom is re-attached below, which resets it to the identity
	const view = d3.zoomTransform(svgElement.value!);

	const ids = shown();
	const nodes: SimNode[] = graph.data.nodes
		.filter((node) => ids.has(node.id))
		.map((node) => ({
			id: node.id,
			label: node.label,
			colour: node.colour,
			// By area, as Obsidian sizes them, so a hub doesn't swamp the picture
			radius: 3 + Math.sqrt(linked(node.id).length) * 2,
			...positions.get(node.id)
		}));
	// Before the simulation, which places every node that has no position yet
	const redrawing = nodes.some((node) => node.x !== undefined);
	const links: SimLink[] = [
		...graph.data.edges.map(([source, target]) => ({ source, target, jump: false })),
		...graph.data.jumps.map(([source, target]) => ({ source, target, jump: true }))
	].filter((link) => ids.has(link.source) && ids.has(link.target));

	neighbours = new Map(nodes.map((node) => [node.id, new Set([node.id])]));
	for (const link of links) {
		neighbours.get(link.source as string)!.add(link.target as string);
		neighbours.get(link.target as string)!.add(link.source as string);
	}

	simulation = d3
		.forceSimulation(nodes)
		.force(
			'link',
			d3
				.forceLink<SimNode, SimLink>(links)
				.id((node) => node.id)
				.distance(gap)
		)
		.force('charge', d3.forceManyBody().strength(-gap * 2.5))
		.force('collide', d3.forceCollide<SimNode>((node) => node.radius + 4))
		// Gentle, so islands drift in near the rest rather than off into the distance. Round the
		// origin, where d3 starts new nodes; fit() frames wherever they end up.
		.force('x', d3.forceX(0).strength(0.04))
		.force('y', d3.forceY(0).strength(0.04))
		.stop();

	const content = svg.append('g');
	const zoom = d3
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.05, 4])
		.on('zoom', (event) => {
			content.attr('transform', event.transform);
			// Names fade in as you zoom, so zoomed out the shape reads instead of a pile of text
			content.style('--label-opacity', String(Math.max(0, Math.min(1, (event.transform.k - 0.6) * 2.5))));
		});
	svg.call(zoom).on('dblclick.zoom', null);
	svg.call(zoom.transform, view);

	if (editor)
		svg.on('dblclick.add', (event: MouseEvent) => {
			if (event.target !== svgElement.value) return;
			const [x, y] = d3.pointer(event, content.node());
			const id = editor.add(null);
			positions.set(id, { x, y });
			editor.open(id);
		});

	const linkLines = content
		.append('g')
		.selectAll<SVGLineElement, SimLink>('line')
		.data(links)
		.join('line')
		.attr('class', (link) => `link${link.jump ? ' jump' : ''}`);

	// Shift-drag from one node to another makes the first a parent of the second
	const linking = content.append('line').attr('class', 'linking');
	const findNode = (x: number, y: number) =>
		nodes.find((node) => Math.hypot(node.x! - x, node.y! - y) < node.radius + 4);

	const nodeGroups = content
		.append('g')
		.selectAll<SVGGElement, SimNode>('g')
		.data(nodes)
		.join('g')
		.attr('class', 'node')
		.on('click', (_event, node) => (focus.value = node.id))
		.on('dblclick', (event: MouseEvent, node) => {
			event.stopPropagation();
			editor?.open(node.id);
		})
		.on('mouseenter', (_event, node) => highlight(node.id))
		.on('mouseleave', () => highlight(focus.value))
		.call(
			d3
				.drag<SVGGElement, SimNode>()
				.on('start', (event, node) => {
					if (editor && event.sourceEvent.shiftKey) return;
					if (!event.active) simulation!.alphaTarget(0.3).restart();
					node.fx = node.x;
					node.fy = node.y;
				})
				.on('drag', (event, node) => {
					if (editor && event.sourceEvent.shiftKey) {
						linking.attr('x1', node.x!).attr('y1', node.y!).attr('x2', event.x).attr('y2', event.y).classed('active', true);
						return;
					}
					node.fx = event.x;
					node.fy = event.y;
				})
				.on('end', (event, node) => {
					if (linking.classed('active')) {
						linking.classed('active', false);
						const target = findNode(event.x, event.y);
						if (target && target !== node) editor?.link(node.id, target.id);
						return;
					}
					if (!event.active) simulation!.alphaTarget(0);
					node.fx = null;
					node.fy = null;
				})
		);
	nodeGroups
		.append('circle')
		.attr('r', (node) => node.radius)
		.style('--node-colour', (node) => node.colour ?? null);
	nodeGroups
		.append('text')
		.attr('y', (node) => node.radius + 12)
		.text((node) => node.label);

	const render = () => {
		linkLines
			.attr('x1', (link) => (link.source as SimNode).x!)
			.attr('y1', (link) => (link.source as SimNode).y!)
			.attr('x2', (link) => (link.target as SimNode).x!)
			.attr('y2', (link) => (link.target as SimNode).y!);
		nodeGroups.attr('transform', (node) => `translate(${node.x},${node.y})`);
		for (const node of nodes) positions.set(node.id, { x: node.x!, y: node.y! });
	};

	const live = animates(props.motion, nodes.length, 500);
	if (redrawing && props.scope === 'local') {
		// A different neighbourhood each time, so it's framed afresh, from where its nodes already were
		simulation.alpha(0.3).tick(60);
		fit(svg, zoom, nodes);
		simulation.alpha(0.1);
	} else if (redrawing) {
		if (live) simulation.alpha(0.3);
		else simulation.alpha(0.3).tick(60);
	} else {
		simulation.tick(live ? 120 : 300);
		fit(svg, zoom, nodes);
		simulation.alpha(0.1);
	}
	render();
	simulation.on('tick', render);
	if (live) simulation.restart();
	highlight(focus.value);
}

function fit(
	svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
	zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
	nodes: SimNode[]
) {
	if (!nodes.length) return;
	const [minX, maxX] = d3.extent(nodes, (node) => node.x!) as [number, number];
	const [minY, maxY] = d3.extent(nodes, (node) => node.y!) as [number, number];
	const margin = 60;
	const scale = Math.min(
		2,
		(width - margin * 2) / Math.max(maxX - minX, 1),
		(height - margin * 2) / Math.max(maxY - minY, 1)
	);
	svg.call(
		zoom.transform,
		d3.zoomIdentity
			.translate(width / 2 - (scale * (minX + maxX)) / 2, height / 2 - (scale * (minY + maxY)) / 2)
			.scale(scale)
	);
}

/** A node and its neighbours stand out and everything else fades, on hover as well as focus */
function highlight(id: string | null) {
	const near = (id && neighbours.get(id)) || new Set<string>();
	const svg = d3.select(svgElement.value!);
	svg
		.selectAll<SVGGElement, SimNode>('.node')
		.classed('current', (node) => node.id === focus.value)
		.classed('near', (node) => near.has(node.id))
		.classed('far', (node) => Boolean(id) && !near.has(node.id));
	svg
		.selectAll<SVGLineElement, SimLink>('.link')
		.classed('lit', (link) => (link.source as SimNode).id === id || (link.target as SimNode).id === id)
		.classed('far', (link) => Boolean(id) && (link.source as SimNode).id !== id && (link.target as SimNode).id !== id);
}

onMounted(draw);
watch(
	() => props.graph.data.id,
	() => positions.clear()
);
watch(
	[() => props.graph, () => props.density, () => props.editor, () => props.motion, () => props.scope, () => props.depth],
	draw
);
// The local graph is drawn around the focus, so moving it changes what's shown
watch(focus, () => (props.scope === 'local' ? draw() : highlight(focus.value)));
onBeforeUnmount(() => simulation?.stop());
</script>

<template>
	<svg ref="svgElement" class="network-graph" :viewBox="`0 0 ${width} ${height}`" />
</template>

<style scoped>
.network-graph {
	display: block;
	width: 100%;
	height: 100%;
	min-height: 480px;
	cursor: grab;
}

.network-graph :deep(.link) {
	stroke: var(--theme--border-color-accent);
	stroke-width: 1;
	transition: opacity 0.15s;
}

.network-graph :deep(.link.jump) {
	stroke-dasharray: 3 3;
}

.network-graph :deep(.link.lit) {
	stroke: var(--theme--primary);
	stroke-width: 1.5;
}

.network-graph :deep(.link.far) {
	opacity: 0.2;
}

.network-graph :deep(.linking) {
	display: none;
	stroke: var(--theme--primary);
	stroke-width: 2;
	stroke-dasharray: 5 4;
	pointer-events: none;
}

.network-graph :deep(.linking.active) {
	display: inline;
}

.network-graph :deep(.node) {
	cursor: pointer;
	transition: opacity 0.15s;
}

.network-graph :deep(.node circle) {
	fill: var(--node-colour, var(--theme--foreground-subdued));
}

.network-graph :deep(.node.current circle) {
	fill: var(--theme--primary);
}

.network-graph :deep(.node text) {
	font-size: 11px;
	fill: var(--theme--foreground);
	text-anchor: middle;
	pointer-events: none;
	opacity: var(--label-opacity, 1);
	transition: opacity 0.15s;
}

/* Whatever you're looking at is always named, however far out */
.network-graph :deep(.node.near text),
.network-graph :deep(.node.current text) {
	opacity: 1;
}

.network-graph :deep(.node.far) {
	opacity: 0.25;
}
</style>
