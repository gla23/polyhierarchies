<script setup lang="ts">
/**
 * One of Explore's side panels: a title, two ways of closing, and an edge to drag for its width.
 * Closed, it comes back for something new to explain (another UI, other data); hidden, it stays
 * away until it's opened from its button.
 */
const props = defineProps<{ title: string; width: number; reopensFor: string }>();
const emit = defineEmits<{ close: [reopen: boolean]; resize: [width: number] }>();

const clamp = (width: number) => Math.min(640, Math.max(220, Math.round(width)));

/** Docked on the right, so it's dragged by its left edge: further left is wider */
function startResize(event: PointerEvent) {
	const handle = event.currentTarget as HTMLElement;
	handle.setPointerCapture(event.pointerId);
	const startX = event.clientX;
	const startWidth = props.width;
	const move = (moved: PointerEvent) => emit('resize', clamp(startWidth + startX - moved.clientX));
	const stop = () => {
		handle.removeEventListener('pointermove', move);
		handle.removeEventListener('pointerup', stop);
		handle.removeEventListener('pointercancel', stop);
	};
	handle.addEventListener('pointermove', move);
	handle.addEventListener('pointerup', stop);
	handle.addEventListener('pointercancel', stop);
}

function nudge(event: KeyboardEvent) {
	const step = event.key === 'ArrowLeft' ? 16 : event.key === 'ArrowRight' ? -16 : 0;
	if (!step) return;
	event.preventDefault();
	emit('resize', clamp(props.width + step));
}
</script>

<template>
	<section class="dock-panel" :style="{ flexBasis: `${width}px` }">
		<button
			type="button"
			class="resize"
			:aria-label="`Width of ${title}: drag, or use the arrow keys`"
			title="Drag to change the width"
			@pointerdown="startResize"
			@keydown="nudge"
		/>
		<header>
			<h2>{{ title }}</h2>
			<button
				type="button"
				class="dock-button"
				title="Hide for good: it won't open by itself again, only from its button"
				:aria-label="`Hide ${title} for good`"
				@click="emit('close', false)"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.6 4 9.5 7a10.7 10.7 0 0 1-2.4 3.6M6.4 6.4A10.8 10.8 0 0 0 2.5 12c.9 3 4.5 7 9.5 7a9.6 9.6 0 0 0 5.3-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
				</svg>
			</button>
			<button
				type="button"
				class="dock-button"
				:title="`Close: it opens again when you pick ${reopensFor}`"
				:aria-label="`Close ${title}`"
				@click="emit('close', true)"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg>
			</button>
		</header>
		<div class="body"><slot /></div>
	</section>
</template>

<style scoped>
.dock-panel {
	position: relative;
	display: flex;
	flex: 0 1 auto;
	flex-direction: column;
	min-width: 200px;
	min-height: 0;
	border-left: var(--theme--border-width) solid var(--theme--border-color);
	background: var(--theme--background-subdued);
}

header {
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 10px 8px 6px 20px;
}

h2 {
	flex: 1;
	min-width: 0;
	margin: 0;
	overflow: hidden;
	font-size: 15px;
	font-weight: 600;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--theme--foreground-accent);
}

.dock-button {
	display: flex;
	padding: 4px;
	color: var(--theme--foreground-subdued);
	background: none;
	border: none;
	border-radius: var(--theme--border-radius);
	cursor: pointer;
}

.dock-button:hover {
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
}

.dock-button svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
}

.body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	overscroll-behavior: contain;
	padding: 4px 20px 16px;
	line-height: 1.5;
}

/* Over the border it shares with whatever is to its left, wide enough to catch */
.resize {
	position: absolute;
	top: 0;
	bottom: 0;
	left: -4px;
	z-index: 1;
	width: 8px;
	padding: 0;
	background: none;
	border: none;
	cursor: col-resize;
}

.resize:hover,
.resize:focus-visible {
	background: linear-gradient(var(--theme--primary), var(--theme--primary)) center / 2px 100% no-repeat;
	outline: none;
}

@media (max-width: 800px) {
	.dock-panel {
		flex-basis: auto !important;
		order: 2;
		border-left: none;
		border-top: var(--theme--border-width) solid var(--theme--border-color);
	}

	.resize {
		display: none;
	}
}
</style>
