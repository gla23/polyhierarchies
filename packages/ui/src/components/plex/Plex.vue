<script setup lang="ts">
import { levelsWithin, type Graph } from '@polyhierarchies/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { animates, densityStyles, type Density, type GraphEditor, type Motion } from '../../editing';
import NodeButton from '../NodeButton.vue';

const props = withDefaults(
	defineProps<{
		graph: Graph;
		editor?: GraphEditor;
		density?: Density;
		motion?: Motion;
		/** Nodes a direction may show across its levels before it stops adding more */
		budget?: number;
	}>(),
	{ density: 'cosy', motion: 'auto', budget: 16 }
);
const focus = defineModel<string | null>('focus', { default: null });

/** The focus, unless it's been deleted, when the first root stands in */
const active = computed(() =>
	focus.value && props.graph.data.nodes.some((node) => node.id === focus.value)
		? focus.value
		: props.graph.roots[0]!
);

/** Each gesture makes a node already linked the right way, then opens it to be named */
function addRelated(relation: 'parent' | 'child' | 'jump') {
	const editor = props.editor!;
	const id = editor.add(relation === 'child' ? active.value : null);
	if (relation === 'parent') editor.link(id, active.value);
	if (relation === 'jump') editor.jump(active.value, id);
	editor.open(id);
}

/** Nearest level first, as ancestors() gives them */
const up = computed(() => levelsWithin(props.graph.ancestors(active.value), props.budget));
const down = computed(() => levelsWithin(props.graph.descendants(active.value), props.budget));
const jumps = computed(() => props.graph.jumps(active.value));

/** A node shows once: a sibling that's already a parent, child or jump stays where it is */
const siblingGroups = computed(() => {
	const shown = new Set([...up.value.flat(), ...down.value.flat(), ...jumps.value]);
	return props.graph
		.siblings(active.value)
		.map((group) => ({ ...group, siblings: group.siblings.filter((id) => !shown.has(id)) }))
		.filter((group) => group.siblings.length);
});

type Slot = 'up' | 'down' | 'jump' | 'sibling' | 'focus';
type Side = 'top' | 'bottom' | 'left' | 'right';
interface Link {
	from: [Slot, string, Side];
	to: [Slot, string, Side];
	kind: 'hierarchy' | 'jump' | 'sibling';
}

const links = computed(() => {
	const { graph } = props;
	const out: Link[] = [];
	const focusTop: [Slot, string, Side] = ['focus', active.value, 'top'];
	const focusBottom: [Slot, string, Side] = ['focus', active.value, 'bottom'];

	up.value.forEach((level, distance) => {
		for (const id of level) {
			if (distance === 0) out.push({ from: ['up', id, 'bottom'], to: focusTop, kind: 'hierarchy' });
			else
				for (const nearer of up.value[distance - 1]!)
					if (graph.parents(nearer).includes(id))
						out.push({ from: ['up', id, 'bottom'], to: ['up', nearer, 'top'], kind: 'hierarchy' });
		}
	});
	down.value.forEach((level, distance) => {
		for (const id of level) {
			if (distance === 0) out.push({ from: focusBottom, to: ['down', id, 'top'], kind: 'hierarchy' });
			else
				for (const nearer of down.value[distance - 1]!)
					if (graph.children(nearer).includes(id))
						out.push({ from: ['down', nearer, 'bottom'], to: ['down', id, 'top'], kind: 'hierarchy' });
		}
	});
	for (const id of jumps.value)
		out.push({ from: ['jump', id, 'right'], to: ['focus', active.value, 'left'], kind: 'jump' });
	for (const { via, siblings } of siblingGroups.value)
		for (const id of siblings)
			out.push({ from: ['up', via, 'bottom'], to: ['sibling', id, 'left'], kind: 'sibling' });
	return out;
});

const root = ref<HTMLElement>();
const anchors = new Map<string, HTMLElement>();
const anchor = (slot: Slot, id: string) => (element: unknown) => {
	const key = `${slot}:${id}`;
	const el = (element as { $el?: HTMLElement } | null)?.$el;
	if (el) anchors.set(key, el);
	else anchors.delete(key);
};

const paths = ref<{ d: string; kind: Link['kind']; ends: string[] }[]>([]);
const hovered = ref<string | null>(null);
/**
 * TheBrain's trick: hovering a parent lights the siblings you share through it, and hovering a
 * sibling lights the parent it came through, so it's plain why siblings are grouped as they are.
 */
const litVia = computed(
	() =>
		new Set(
			siblingGroups.value
				.filter((group) => group.via === hovered.value || group.siblings.includes(hovered.value!))
				.map((group) => group.via)
		)
);

function point([slot, id, side]: [Slot, string, Side], origin: DOMRect) {
	const rect = anchors.get(`${slot}:${id}`)?.getBoundingClientRect();
	if (!rect) return null;
	const x = rect.left - origin.left;
	const y = rect.top - origin.top;
	if (side === 'top') return { x: x + rect.width / 2, y };
	if (side === 'bottom') return { x: x + rect.width / 2, y: y + rect.height };
	if (side === 'left') return { x, y: y + rect.height / 2 };
	return { x: x + rect.width, y: y + rect.height / 2 };
}

/** The lines are drawn from where the buttons actually laid out, so measure after every render */
function measure() {
	if (!root.value) return;
	const origin = root.value.getBoundingClientRect();
	paths.value = links.value.flatMap((link) => {
		const a = point(link.from, origin);
		const b = point(link.to, origin);
		if (!a || !b) return [];
		const d =
			link.kind === 'hierarchy'
				? `M${a.x},${a.y} C${a.x},${(a.y + b.y) / 2} ${b.x},${(a.y + b.y) / 2} ${b.x},${b.y}`
				: link.kind === 'jump'
					? `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`
					: `M${a.x},${a.y} C${a.x},${b.y} ${a.x},${b.y} ${b.x},${b.y}`;
		return [{ d, kind: link.kind, ends: [link.from[1], link.to[1]] }];
	});
}

watch([links, () => props.graph], measure, { flush: 'post' });
let observer: ResizeObserver | undefined;
onMounted(() => {
	observer = new ResizeObserver(measure);
	observer.observe(root.value!);
	measure();
});
onBeforeUnmount(() => observer?.disconnect());

/**
 * Refocusing is a view transition: each node carries its own name, so a sibling clicked glides into
 * the middle as the new focus while the old one slides up to become its parent, as TheBrain does.
 * Two ticks: one for the nodes to move, one for the lines measured from where they landed.
 */
function pick(id: string) {
	const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced || !animated.value || !document.startViewTransition) return void (focus.value = id);
	document.startViewTransition(async () => {
		focus.value = id;
		await nextTick();
		await nextTick();
	});
}

/** In a cycle a node can be both above and below the focus. A name used twice aborts the whole
 *  transition, so those go unnamed and simply crossfade. */
const shownTwice = computed(() => {
	const shown = [
		...up.value.flat(),
		...down.value.flat(),
		...jumps.value,
		active.value,
		...siblingGroups.value.flatMap((group) => group.siblings)
	];
	return new Set(shown.filter((id, index) => shown.indexOf(id) !== index));
});

const transitionName = (id: string) =>
	shownTwice.value.has(id)
		? {}
		: { viewTransitionName: `plex-${CSS.escape(id)}`, viewTransitionClass: 'plex-node' };

/** A view transition snapshots every named node, so a crowded plex just swaps */
const animated = computed(() =>
	animates(props.motion, up.value.flat().length + down.value.flat().length + jumps.value.length, 80)
);

const isolated = computed(() => !up.value.length && !down.value.length && !jumps.value.length);
</script>

<template>
	<div ref="root" class="plex" :style="densityStyles[density]">
		<svg class="links" aria-hidden="true">
			<path
				v-for="(path, index) in paths"
				:key="index"
				:d="path.d"
				:class="[path.kind, { lit: hovered && path.ends.includes(hovered) }]"
			/>
		</svg>

		<!-- Farthest level at the top, so the nearest sits against the focus -->
		<div
			v-for="(level, distance) in [...up].reverse()"
			:key="`up${distance}`"
			class="level"
			:style="{ '--distance': up.length - distance }"
		>
			<NodeButton
				v-for="id in level"
				:key="id"
				:ref="anchor('up', id)"
				:graph="graph"
				:id="id"
				:style="transitionName(id)"
				:echo="hovered === id || (distance === up.length - 1 && litVia.has(id))"
				@click="pick(id)"
				@mouseenter="hovered = id"
				@mouseleave="hovered = null"
			/>
		</div>

		<div class="middle">
			<div class="jumps">
				<NodeButton
					v-for="id in jumps"
					:key="id"
					:ref="anchor('jump', id)"
					:graph="graph"
					:id="id"
					:style="transitionName(id)"
					:echo="hovered === id"
					@click="pick(id)"
					@mouseenter="hovered = id"
					@mouseleave="hovered = null"
				/>
			</div>
			<div class="focus-cell">
				<NodeButton
					:ref="anchor('focus', active)"
					class="focus"
					:graph="graph"
					:id="active"
					:style="transitionName(active)"
					current
					@dblclick="editor?.open(active)"
					@mouseenter="hovered = active"
					@mouseleave="hovered = null"
				/>
				<div v-if="editor" class="edit-actions">
					<button type="button" @click="addRelated('parent')">+ Parent</button>
					<button type="button" @click="addRelated('child')">+ Child</button>
					<button type="button" @click="addRelated('jump')">+ Jump</button>
					<button type="button" @click="editor.open(active)">Edit</button>
				</div>
			</div>
			<div class="siblings">
				<div
					v-for="group in siblingGroups"
					:key="group.via"
					class="group"
					:class="{ lit: litVia.has(group.via) }"
				>
					<span class="via">via {{ graph.label(group.via) }}</span>
					<NodeButton
						v-for="id in group.siblings"
						:key="id"
						:ref="anchor('sibling', id)"
						:graph="graph"
						:id="id"
						:style="transitionName(id)"
						:echo="hovered === id || hovered === group.via"
						@click="pick(id)"
						@mouseenter="hovered = id"
						@mouseleave="hovered = null"
					/>
				</div>
			</div>
		</div>

		<p v-if="isolated" class="isolated">No parents, children or jumps: nothing links here.</p>

		<div
			v-for="(level, distance) in down"
			:key="`down${distance}`"
			class="level"
			:style="{ '--distance': distance + 1 }"
		>
			<NodeButton
				v-for="id in level"
				:key="id"
				:ref="anchor('down', id)"
				:graph="graph"
				:id="id"
				:style="transitionName(id)"
				:echo="hovered === id"
				@click="pick(id)"
				@mouseenter="hovered = id"
				@mouseleave="hovered = null"
			/>
		</div>
	</div>
</template>

<style>
/* Global, as the pseudo-elements live on the document; the class keeps it to the plex's nodes */
::view-transition-group(*.plex-node) {
	animation-duration: 380ms;
	animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
</style>

<style scoped>
.plex {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: calc(var(--row-height) - 8px);
	padding: 24px;
}

.links {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	overflow: visible;
}

.links path {
	fill: none;
	stroke: var(--theme--border-color-accent);
	stroke-width: 1.5;
	transition: opacity 0.15s;
}

.links path.jump {
	stroke-dasharray: 4 4;
}

.links path.sibling {
	opacity: 0.5;
}

.links path.lit {
	stroke: var(--theme--primary);
	opacity: 1;
}

.level {
	position: relative;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8px;
	/* Further levels fade, so the eye settles on what's closest to the focus — to a floor, as a
	   sparse neighbourhood can fit enough levels to fade one out entirely while its lines stay */
	opacity: max(0.45, 1 - (var(--distance) - 1) * 0.15);
}

.middle {
	position: relative;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
	align-items: center;
	gap: 48px;
}

.jumps {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 8px;
}

.focus-cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.focus {
	font-size: 1.25em;
}

.edit-actions {
	display: flex;
	gap: 4px;
}

.edit-actions button {
	padding: 2px 8px;
	font: inherit;
	font-size: 12px;
	color: var(--theme--foreground-subdued);
	background: var(--theme--background);
	border: var(--theme--border-width) dashed var(--theme--border-color-accent);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.edit-actions button:hover {
	color: var(--theme--foreground);
	border-color: var(--theme--primary);
}

.siblings {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.group {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
}

.isolated {
	margin: 0;
	text-align: center;
	color: var(--theme--foreground-subdued);
}

.via {
	width: 100%;
	font-size: 0.75em;
	color: var(--theme--foreground-subdued);
}

.group.lit .via {
	color: var(--theme--primary);
}
</style>
