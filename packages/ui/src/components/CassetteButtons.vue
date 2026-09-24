<script setup lang="ts" generic="Value extends string">
/** A row of buttons that press in like cassette-player keys, one at a time */
defineProps<{ options: { value: Value; label: string; title?: string }[]; label?: string }>();
const model = defineModel<Value>({ required: true });
</script>

<template>
	<div class="cassette-buttons" role="group" :aria-label="label">
		<button
			v-for="option in options"
			:key="option.value"
			type="button"
			:class="{ active: model === option.value }"
			:aria-pressed="model === option.value"
			:title="option.title"
			@click="model = option.value"
		>
			{{ option.label }}
		</button>
	</div>
</template>

<style scoped>
@property --edge-y {
	syntax: '<length>';
	initial-value: 3px;
	inherits: false;
}

.cassette-buttons {
	display: inline-flex;
	/* Room for the raised keys' edge, so the row doesn't clip it */
	padding-bottom: 4px;
	--press-duration: 80ms;
	--hover-duration: 250ms;
	--spring-duration: 400ms;
	--spring-easing: cubic-bezier(0.34, 1.56, 0.64, 1);
}

button {
	position: relative;
	z-index: 1;
	margin-left: -1px;
	padding: 6px 14px;
	font: inherit;
	color: var(--theme--foreground);
	background: var(--theme--background-normal);
	border: var(--theme--border-width) solid var(--theme--border-color-accent);
	border-radius: 0;
	cursor: pointer;
	--edge-y: 3px;
	/* transform is derived from --edge-y so they can never desync on rapid clicks */
	transform: translateY(calc(3px - var(--edge-y)));
	transition: --edge-y var(--spring-duration) var(--spring-easing) 1ms;
	box-shadow:
		inset 0 1px 0 color-mix(in srgb, white 12%, transparent),
		0 var(--edge-y) 0 0 var(--theme--border-color-accent),
		0 calc(var(--edge-y) + 1px) 3px rgba(0, 0, 0, 0.25);
}

button:first-child {
	margin-left: 0;
	border-top-left-radius: var(--theme--border-radius);
	border-bottom-left-radius: var(--theme--border-radius);
}

button:last-child {
	border-top-right-radius: var(--theme--border-radius);
	border-bottom-right-radius: var(--theme--border-radius);
}

button:hover:not(.active) {
	z-index: 2;
	--edge-y: 4px;
	transition: --edge-y var(--hover-duration) ease-out;
}

/* :active is the press while the mouse is down; .active is the key staying in */
button:active:not(.active),
button.active {
	z-index: 2;
	--edge-y: 0px;
	color: var(--theme--foreground-accent);
	background: var(--theme--primary-background);
	transition: --edge-y var(--press-duration) ease-out;
}

/* The press drops the key out from under the pointer, so a mouseup near its top edge would land in
   the gap and no click would fire — hold the vacated strip as part of the button */
button:active::before {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: 100%;
	height: 8px;
}
</style>
