<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { sections, type PriorArtEntry, type Shot } from './priorArt';

type Part = { text: string; href?: string; code?: boolean };

/** A step's [links](url) and `code`, as parts to render without v-html */
function parts(step: string): Part[] {
	const out: Part[] = [];
	let last = 0;
	for (const match of step.matchAll(/\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g)) {
		if (match.index > last) out.push({ text: step.slice(last, match.index) });
		out.push(match[3] !== undefined ? { text: match[3], code: true } : { text: match[1]!, href: match[2] });
		last = match.index + match[0].length;
	}
	if (last < step.length) out.push({ text: step.slice(last) });
	return out;
}

const url = (shot: Shot) => `${import.meta.env.BASE_URL}${shot.src}`;
const hero = (entry: PriorArtEntry) => entry.shots?.find((shot) => shot.point === null);
const shotsFor = (entry: PriorArtEntry, point: number) =>
	entry.shots?.filter((shot) => shot.point === point) ?? [];

const open = reactive(new Set<string>());
function toggle(name: string) {
	if (open.has(name)) open.delete(name);
	else open.add(name);
}

const dialog = ref<HTMLDialogElement>();
const viewing = ref<Shot | null>(null);
function view(shot: Shot) {
	viewing.value = shot;
	dialog.value?.showModal();
}
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * The contents beside the page, showing how far down it you are and which site you're on. The
 * page scrolls inside App's reading pane rather than the window, so that's what it listens to.
 */
const root = ref<HTMLElement>();
const progress = ref(0);
const current = ref<string | null>(null);
let scroller: HTMLElement | null = null;
let frame = 0;
function measure() {
	frame = 0;
	if (!scroller) return;
	const { scrollTop, scrollHeight, clientHeight } = scroller;
	progress.value = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 1;
	// The entry whose top has passed a third of the way down the view
	const line = scroller.getBoundingClientRect().top + clientHeight / 3;
	let found: string | null = null;
	for (const element of root.value?.querySelectorAll<HTMLElement>('.entry') ?? [])
		if (element.getBoundingClientRect().top <= line) found = element.id;
	current.value = found;
}
const onScroll = () => (frame ||= requestAnimationFrame(measure));
onMounted(() => {
	scroller = root.value?.parentElement ?? null;
	scroller?.addEventListener('scroll', onScroll, { passive: true });
	measure();
});
onBeforeUnmount(() => {
	scroller?.removeEventListener('scroll', onScroll);
	cancelAnimationFrame(frame);
});
function jump(name: string) {
	document.getElementById(slug(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// A click on the dialog itself, rather than the picture inside it, is on the backdrop
function onDialogClick(event: MouseEvent) {
	if (event.target === dialog.value) dialog.value.close();
}
</script>

<template>
	<div ref="root" class="layout">
		<article class="page">
			<h1>Prior art</h1>
			<p class="lede">
				Things in the wild that give an item several parents, all free to try in the browser. Click a
				picture to see it full size; each site has a walkthrough if you want to follow along.
			</p>

			<section v-for="section in sections" :key="section.title">
				<h2>{{ section.title }}</h2>
				<p class="about">{{ section.about }}</p>
				<div v-for="entry in section.entries" :id="slug(entry.name)" :key="entry.name" class="entry">
					<figure v-if="hero(entry)" class="hero">
						<button type="button" class="shot" :title="'View full size'" @click="view(hero(entry)!)">
							<img :src="url(hero(entry)!)" :alt="hero(entry)!.alt" loading="lazy" />
						</button>
						<figcaption>{{ hero(entry)!.caption }}</figcaption>
					</figure>
					<h3>
						<a :href="entry.href" target="_blank" rel="noopener">{{ entry.name }} ↗</a>
					</h3>
					<p class="summary">{{ entry.summary }}</p>
					<ul class="points">
						<li v-for="(point, index) in entry.points" :key="point">
							{{ point }}
							<figure v-for="shot in shotsFor(entry, index)" :key="shot.src" class="inline">
								<button type="button" class="shot" title="View full size" @click="view(shot)">
									<img :src="url(shot)" :alt="shot.alt" loading="lazy" />
								</button>
								<figcaption>{{ shot.caption }}</figcaption>
							</figure>
						</li>
					</ul>
					<button
						type="button"
						class="walkthrough-toggle"
						:aria-expanded="open.has(entry.name)"
						@click="toggle(entry.name)"
					>
						<span class="chevron" aria-hidden="true">›</span>
						{{ open.has(entry.name) ? 'Hide' : 'Show' }} the walkthrough ({{ entry.steps.length }} steps)
					</button>
					<ol v-if="open.has(entry.name)" class="steps">
						<li v-for="step in entry.steps" :key="step">
							<template v-for="(part, index) in parts(step)" :key="index">
								<a v-if="part.href" :href="part.href" target="_blank" rel="noopener">{{ part.text }}</a>
								<code v-else-if="part.code">{{ part.text }}</code>
								<template v-else>{{ part.text }}</template>
							</template>
						</li>
					</ol>
				</div>
			</section>

			<dialog ref="dialog" class="viewer" @click="onDialogClick" @close="viewing = null">
				<figure v-if="viewing">
					<img :src="url(viewing)" :alt="viewing.alt" />
					<figcaption>
						{{ viewing.caption }}
						<button type="button" class="close" @click="dialog?.close()">Close</button>
					</figcaption>
				</figure>
			</dialog>
		</article>

		<nav class="minimap" aria-label="On this page">
			<div class="track" aria-hidden="true">
				<div class="fill" :style="{ transform: `scaleY(${progress})` }" />
			</div>
			<div v-for="section in sections" :key="section.title" class="minimap-section">
				<span class="minimap-title">{{ section.title }}</span>
				<button
					v-for="entry in section.entries"
					:key="entry.name"
					type="button"
					:class="{ current: current === slug(entry.name) }"
					:aria-current="current === slug(entry.name) ? 'location' : undefined"
					@click="jump(entry.name)"
				>
					{{ entry.name }}
				</button>
			</div>
		</nav>
	</div>
</template>

<style scoped>
.layout {
	display: grid;
	grid-template-columns: minmax(0, 760px) 200px;
	justify-content: center;
	gap: 32px;
	padding: 0 24px;
}

.page {
	padding: 32px 0 64px;
	line-height: 1.6;
}

.entry {
	scroll-margin-top: 16px;
}

/* Sticky inside the reading pane, which is what scrolls */
.minimap {
	position: sticky;
	top: 32px;
	align-self: start;
	display: flex;
	flex-direction: column;
	gap: 12px;
	max-height: calc(100vh - 140px);
	padding-left: 14px;
	overflow-y: auto;
}

.track {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	width: 2px;
	background: var(--theme--border-color-subdued);
	border-radius: 1px;
}

.fill {
	height: 100%;
	background: var(--theme--primary);
	border-radius: 1px;
	transform-origin: top;
}

.minimap-section {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.minimap-title {
	margin-bottom: 2px;
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--theme--foreground-subdued);
}

.minimap button {
	padding: 1px 0;
	font: inherit;
	font-size: 13px;
	text-align: left;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	cursor: pointer;
}

.minimap button:hover {
	color: var(--theme--foreground);
}

.minimap button.current {
	font-weight: 600;
	color: var(--theme--primary);
}

/* No room beside the text: the page reads as it did before */
@media (max-width: 1080px) {
	.layout {
		grid-template-columns: minmax(0, 760px);
	}

	.minimap {
		display: none;
	}
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
	margin: 40px 0 4px;
	font-size: 19px;
	font-weight: 600;
	color: var(--theme--foreground-accent);
}

.about {
	margin: 0 0 8px;
	color: var(--theme--foreground-subdued);
}

.entry {
	padding: 24px 0 16px;
	border-top: var(--theme--border-width) solid var(--theme--border-color-subdued);
}

figure {
	margin: 0;
}

figcaption {
	margin-top: 4px;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
}

.hero {
	margin-bottom: 12px;
}

/* A real button, so keyboard-hint extensions can open a picture too. As wide as its picture, so
   a tall one, capped in height, doesn't leave an empty frame beside it. */
.shot {
	display: block;
	max-width: 100%;
	padding: 0;
	background: none;
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	overflow: hidden;
	cursor: zoom-in;
}

.shot img {
	display: block;
	max-width: 100%;
	max-height: 380px;
	width: auto;
	height: auto;
}

.inline {
	margin: 8px 0 4px;
}

.inline .shot img {
	max-width: min(100%, 420px);
	max-height: 240px;
}

h3 {
	margin: 0;
	font-size: 16px;
	font-weight: 600;
}

h3 a {
	color: var(--theme--primary);
	text-decoration: none;
}

h3 a:hover {
	text-decoration: underline;
}

.summary {
	margin: 2px 0 8px;
	color: var(--theme--foreground-subdued);
}

ul,
ol {
	margin: 0;
	padding-left: 22px;
}

li + li {
	margin-top: 6px;
}

.walkthrough-toggle {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin: 12px 0 0;
	padding: 4px 10px 4px 6px;
	font: inherit;
	font-size: 13px;
	color: var(--theme--foreground-subdued);
	background: none;
	border: var(--theme--border-width) solid var(--theme--border-color-accent);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.walkthrough-toggle:hover {
	color: var(--theme--foreground);
}

.chevron {
	display: inline-block;
	width: 12px;
	text-align: center;
	transition: transform 0.15s;
}

.walkthrough-toggle[aria-expanded='true'] .chevron {
	transform: rotate(90deg);
}

.steps {
	margin-top: 10px;
}

.steps li::marker {
	font-weight: 600;
	color: var(--theme--primary);
}

.steps a {
	color: var(--theme--primary);
}

code {
	padding: 1px 5px;
	font-family: var(--theme--fonts--monospace--font-family);
	font-size: 0.88em;
	overflow-wrap: anywhere;
	background: var(--theme--background-normal);
	border-radius: var(--theme--border-radius);
}

.viewer {
	max-width: 96vw;
	max-height: 96vh;
	padding: 12px;
	color: var(--theme--foreground);
	background: var(--theme--background);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
}

.viewer::backdrop {
	background: rgb(0 0 0 / 0.6);
}

.viewer img {
	display: block;
	max-width: calc(96vw - 26px);
	max-height: calc(96vh - 80px);
	height: auto;
}

.viewer figcaption {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	margin-top: 8px;
	font-size: 14px;
}

.close {
	flex-shrink: 0;
	padding: 4px 12px;
	font: inherit;
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
	border: var(--theme--border-width) solid var(--theme--border-color);
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}
</style>
