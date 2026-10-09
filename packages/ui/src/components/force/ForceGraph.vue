<script setup lang="ts">
import type { Graph } from '@polyhierarchies/core';
import * as d3 from 'd3';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { animates, type Density, type GraphEditor, type Motion } from '../../editing';

/** Ported from a force-directed graph Directus layout, which this began as */
const props = withDefaults(
	defineProps<{ graph: Graph; editor?: GraphEditor; density?: Density; motion?: Motion }>(),
	{ density: 'cosy', motion: 'auto' }
);
const focus = defineModel<string | null>('focus', { default: null });

/** Density sets the gap between layers, the graph's equivalent of row height */
const tiers: Record<Density, number> = { compact: 80, cosy: 110, comfortable: 150 };

/** Where each node was, so a redraw after an edit keeps the layout and only settles what changed */
const positions = new Map<string, { x: number; y: number }>();

interface SimNode extends d3.SimulationNodeDatum {
	id: string;
	label: string;
	colour?: string;
	width: number;
	depth: number;
	/** Being shift-dragged to another node to link them, rather than moved */
	linking?: boolean;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
	kind: 'hierarchy' | 'jump';
	/** The parent end, whose hue the link takes */
	parent?: string;
	/** The edge that closes a cycle */
	cycle?: boolean;
}

const width = 1000;
const height = 600;
const nodeHeight = 22;

/** Marker ids are page-global, so each graph on a page needs its own */
const markerPrefix = `force-graph-${Math.random().toString(36).slice(2)}`;
const marker = (name: string) => `url(#${markerPrefix}-${name})`;

const svgElement = ref<SVGSVGElement>();
let simulation: d3.Simulation<SimNode, SimLink> | undefined;

function draw() {
	simulation?.stop();
	const { graph, editor } = props;
	const tier = tiers[props.density];
	const svg = d3.select(svgElement.value!);
	svg.selectAll('*').remove();
	// Taken before the zoom is re-attached below, which resets it to the identity
	const view = d3.zoomTransform(svgElement.value!);

	const redrawing = positions.size > 0;
	const nodes: SimNode[] = graph.data.nodes.map((node) => ({
		id: node.id,
		label: node.label,
		colour: node.colour,
		width: node.label.length * 7 + (node.colour ? 32 : 20),
		depth: graph.depth(node.id),
		...positions.get(node.id)
	}));
	const links: SimLink[] = [
		...graph.data.edges.map(([source, target]) => ({
			source,
			target,
			kind: 'hierarchy' as const,
			parent: source,
			cycle: graph.closesCycle(source, target)
		})),
		...graph.data.jumps.map(([source, target]) => ({ source, target, kind: 'jump' as const }))
	];

	// Each parent's links share a hue, so the several parents of one node read apart
	const parentIds = [...new Set(graph.data.edges.map(([parent]) => parent))].sort();
	const hue = new Map(parentIds.map((id, index) => [id, `hsl(${index / parentIds.length}turn 70% 62%)`]));

	const layers = Math.max(...nodes.map((node) => node.depth)) + 1;
	const top = height / 2 - ((layers - 1) * tier) / 2;

	simulation = d3
		.forceSimulation(nodes)
		.force(
			'link',
			d3
				.forceLink<SimNode, SimLink>(links)
				.id((node) => node.id)
				.distance((link) => (link.kind === 'jump' ? 180 : tier))
				.strength((link) => (link.kind === 'jump' ? 0.05 : 0.4))
		)
		.force('charge', d3.forceManyBody().strength(-350))
		.force(
			'collide',
			d3.forceCollide<SimNode>((node) => Math.min(node.width / 2, 70) + 6)
		)
		// Layered by depth rather than left to float, so children always hang below their parents
		.force('y', d3.forceY<SimNode>((node) => top + node.depth * tier).strength(0.5))
		.force('x', d3.forceX(width / 2).strength(0.03))
		.stop();

	const zoom = d3
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.05, 2])
		.on('zoom', (event) => {
			content.attr('transform', event.transform);
			// Names fade out as you zoom out, so a big graph reads as a shape, as Obsidian's does
			content.style('--label-opacity', String(Math.max(0, Math.min(1, (event.transform.k - 0.45) * 2.5))));
		});
	// Double-click is for adding a node here, not zooming
	svg.call(zoom).on('dblclick.zoom', null);

	// An arrowhead per state, as a marker can't take the colour of the line it ends
	const defs = svg.append('defs');
	for (const name of ['arrow', 'lit', 'cycle'])
		defs
			.append('marker')
			.attr('id', `${markerPrefix}-${name}`)
			.attr('class', `marker ${name}`)
			.attr('viewBox', '0 0 10 10')
			.attr('refX', 10)
			.attr('refY', 5)
			.attr('markerWidth', 4)
			.attr('markerHeight', 4)
			.attr('orient', 'auto')
			.append('path')
			.attr('d', 'M0,0L10,5L0,10z');

	const content = svg.append('g');

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
		.attr('class', (link) => `link ${link.kind}${link.cycle ? ' cycle' : ''}`)
		.attr('stroke', (link) => (link.parent && !link.cycle ? hue.get(link.parent)! : null));

	// Wider than they look, so a line can be clicked to remove it
	const linkHits = editor
		? content
				.append('g')
				.selectAll<SVGLineElement, SimLink>('line')
				.data(links)
				.join('line')
				.attr('class', 'link-hit')
				.on('click', (_event, link) => {
					const [a, b] = [(link.source as SimNode).id, (link.target as SimNode).id];
					const what =
						link.kind === 'jump'
							? `the jump between ${graph.label(a)} and ${graph.label(b)}`
							: `${graph.label(a)} → ${graph.label(b)}`;
					if (!confirm(`Remove ${what}?`)) return;
					if (link.kind === 'jump') editor.unjump(a, b);
					else editor.unlink(a, b);
				})
		: null;

	// Shift-drag from one node to another makes the first a parent of the second
	const linking = content.append('line').attr('class', 'linking');
	const findNode = (x: number, y: number) =>
		nodes.find(
			(node) => Math.abs(node.x! - x) < node.width / 2 && Math.abs(node.y! - y) < nodeHeight / 2
		);

	const nodeGroups = content
		.append('g')
		.selectAll<SVGGElement, SimNode>('g')
		.data(nodes)
		.join('g')
		.attr('class', 'node')
		.on('click', (_event, node) => (focus.value = node.id))
		.on('mouseenter', (_event, node) => highlight(node.id))
		.on('mouseleave', () => highlight())
		.on('dblclick', (event: MouseEvent, node) => {
			event.stopPropagation();
			editor?.open(node.id);
		})
		.call(
			d3
				.drag<SVGGElement, SimNode>()
				.on('start', (event, node) => {
					if (editor && event.sourceEvent.shiftKey) {
						node.linking = true;
						return;
					}
					if (!event.active) simulation!.alphaTarget(0.3).restart();
					node.fx = node.x;
					node.fy = node.y;
				})
				.on('drag', (event, node) => {
					if (node.linking) {
						linking
							.attr('x1', node.x!)
							.attr('y1', node.y!)
							.attr('x2', event.x)
							.attr('y2', event.y)
							.classed('active', true);
						return;
					}
					node.fx = event.x;
					node.fy = event.y;
				})
				.on('end', (event, node) => {
					if (node.linking) {
						node.linking = false;
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
		.append('rect')
		.attr('x', (node) => -node.width / 2)
		.attr('y', -nodeHeight / 2)
		.attr('width', (node) => node.width)
		.attr('height', nodeHeight)
		.attr('rx', 5);
	nodeGroups
		.filter((node) => Boolean(node.colour))
		.append('circle')
		.attr('class', 'colour')
		.attr('cx', (node) => -node.width / 2 + 11)
		.attr('r', 4)
		.attr('fill', (node) => node.colour!);
	nodeGroups
		.append('text')
		.attr('x', (node) => (node.colour ? 6 : 0))
		.attr('y', 4)
		.text((node) => node.label);

	/** Where the line between two centres crosses `node`'s box (plus a gap), so an arrowhead
	 *  lands on the border rather than hidden under the label */
	const edge = (node: SimNode, other: SimNode, gap: number) => {
		const dx = other.x! - node.x!;
		const dy = other.y! - node.y!;
		const along = Math.min(
			1,
			(node.width / 2 + gap) / Math.abs(dx || 1e-6),
			(nodeHeight / 2 + gap) / Math.abs(dy || 1e-6)
		);
		return [node.x! + dx * along, node.y! + dy * along] as const;
	};

	const render = () => {
		const place = function (this: SVGLineElement, link: SimLink) {
			const source = link.source as SimNode;
			const target = link.target as SimNode;
			const [x1, y1] = edge(source, target, 0);
			const [x2, y2] = edge(target, source, 3);
			d3.select(this).attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
		};
		linkLines.each(place);
		linkHits?.each(place);
		nodeGroups.attr('transform', (node) => `translate(${node.x},${node.y})`);
		for (const node of nodes) positions.set(node.id, { x: node.x!, y: node.y! });
	};

	// Past a few hundred nodes, repainting every line each frame costs more than the motion shows,
	// so the layout settles before anything is drawn and then holds still
	const live = animates(props.motion, nodes.length, 500);
	if (redrawing) {
		// Keep the view where it was: only what changed has to settle
		svg.call(zoom.transform, view);
		if (live) simulation.alpha(0.3);
		else simulation.alpha(0.3).tick(60);
	} else {
		// Settle most of the way before the first paint, rather than exploding out from the centre
		simulation.tick(live ? 120 : 300);
		fit(svg, zoom, nodes);
		simulation.alpha(0.1);
	}
	render();
	simulation.on('tick', render);
	if (live) simulation.restart();
	highlight();
}

function fit(
	svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
	zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
	nodes: SimNode[]
) {
	if (!nodes.length) return;
	const [minX, maxX] = d3.extent(nodes, (node) => node.x!) as [number, number];
	const [minY, maxY] = d3.extent(nodes, (node) => node.y!) as [number, number];
	const margin = 80;
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

/**
 * Focus and its neighbours stand out without redrawing, so moving the focus keeps the layout. A
 * hovered node does the same while the pointer is on it.
 */
function highlight(id = focus.value) {
	const near = new Set(
		id ? [id, ...props.graph.parents(id), ...props.graph.children(id), ...props.graph.jumps(id)] : []
	);
	const svg = d3.select(svgElement.value!);
	svg
		.selectAll<SVGGElement, SimNode>('.node')
		.classed('current', (node) => node.id === focus.value)
		.classed('near', (node) => near.has(node.id) && node.id !== focus.value)
		.classed('far', (node) => Boolean(id) && !near.has(node.id));
	const lit = (link: SimLink) =>
		(link.source as SimNode).id === id || (link.target as SimNode).id === id;
	svg
		.selectAll<SVGLineElement, SimLink>('.link')
		.classed('lit', lit)
		.attr('marker-end', (link) =>
			link.kind === 'jump' ? null : marker(lit(link) ? 'lit' : link.cycle ? 'cycle' : 'arrow')
		);
}

onMounted(draw);
watch(
	() => props.graph.data.id,
	() => positions.clear()
);
watch([() => props.graph, () => props.density, () => props.editor, () => props.motion], draw);
watch(focus, highlight);
onBeforeUnmount(() => simulation?.stop());
</script>

<template>
	<svg ref="svgElement" class="force-graph" :viewBox="`0 0 ${width} ${height}`" />
</template>

<style scoped>
.force-graph {
	display: block;
	width: 100%;
	height: 100%;
	min-height: 480px;
	cursor: grab;
}

.force-graph :deep(.link) {
	stroke-width: 1.5;
	stroke-opacity: 0.6;
	transition: opacity 0.15s;
}

.force-graph :deep(.link.jump) {
	stroke: var(--theme--foreground-subdued);
	stroke-dasharray: 4 4;
}

/* The edge that closes a cycle, so the loop can be found at a glance */
.force-graph :deep(.link.cycle) {
	stroke: var(--theme--warning);
	stroke-opacity: 1;
	stroke-width: 2;
}

.force-graph :deep(.link.lit) {
	stroke: var(--theme--primary);
	stroke-opacity: 1;
}

.force-graph :deep(.marker path) {
	fill: var(--theme--foreground-subdued);
}

.force-graph :deep(.marker.cycle path) {
	fill: var(--theme--warning);
}

.force-graph :deep(.marker.lit path) {
	fill: var(--theme--primary);
}

.force-graph :deep(.link-hit) {
	stroke: transparent;
	stroke-width: 10;
	cursor: pointer;
}

.force-graph :deep(.link-hit:hover) {
	stroke: color-mix(in srgb, var(--theme--danger) 30%, transparent);
}

.force-graph :deep(.linking) {
	display: none;
	stroke: var(--theme--primary);
	stroke-width: 2;
	stroke-dasharray: 5 4;
	pointer-events: none;
}

.force-graph :deep(.linking.active) {
	display: inline;
}

.force-graph :deep(.node) {
	cursor: pointer;
	transition: opacity 0.15s;
}

.force-graph :deep(.node rect) {
	fill: var(--theme--background-normal);
	stroke: var(--theme--border-color-accent);
}

.force-graph :deep(.node text) {
	opacity: var(--label-opacity, 1);
	font-size: 12px;
	fill: var(--theme--foreground);
	text-anchor: middle;
	pointer-events: none;
}

.force-graph :deep(.node.current rect) {
	fill: var(--theme--primary-background);
	stroke: var(--theme--primary);
}

.force-graph :deep(.node.near rect) {
	stroke: var(--theme--primary);
}

/* Whatever you're looking at is always named, however far out */
.force-graph :deep(.node.current text),
.force-graph :deep(.node.near text) {
	opacity: 1;
}

.force-graph :deep(.node.far) {
	opacity: 0.35;
}
</style>
