<script setup lang="ts">
import { computed } from 'vue';
import { concepts } from '../pages/concepts';
import ExploreLink from './ExploreLink.vue';

/** Around every concept page: the way back to the index, and on to its neighbours */
const props = defineProps<{ id: string }>();
const index = computed(() => concepts.findIndex((concept) => concept.id === props.id));
const previous = computed(() => concepts[index.value - 1]);
const next = computed(() => concepts[index.value + 1]);
</script>

<template>
	<div class="concept-frame">
		<nav class="crumbs" aria-label="Concepts">
			<ExploreLink :to="{ page: 'concepts' }">‹ Concepts</ExploreLink>
		</nav>
		<slot />
		<nav class="neighbours" aria-label="Other concepts">
			<ExploreLink v-if="previous" :to="{ page: previous.id }" class="previous">
				<span>Previous</span>{{ previous.title }}
			</ExploreLink>
			<ExploreLink v-if="next" :to="{ page: next.id }" class="next">
				<span>Next</span>{{ next.title }}
			</ExploreLink>
		</nav>
	</div>
</template>

<style scoped>
.crumbs,
.neighbours {
	max-width: 720px;
	margin: 0 auto;
	padding: 0 24px;
}

.crumbs {
	padding-top: 20px;
	font-size: 13px;
}

.crumbs a {
	color: var(--theme--foreground-subdued);
	text-decoration: none;
}

.crumbs a:hover {
	color: var(--theme--primary);
}

/* The pages bring their own top padding; pull them up under the crumbs */
.crumbs + :deep(*) {
	padding-top: 12px;
}

.neighbours {
	display: flex;
	justify-content: space-between;
	gap: 16px;
	padding-bottom: 48px;
}

.neighbours a {
	display: flex;
	flex-direction: column;
	max-width: 48%;
	padding: 10px 14px;
	color: var(--theme--foreground);
	text-decoration: none;
	border: var(--theme--border-width) solid var(--theme--border-color-subdued);
	border-radius: var(--theme--border-radius);
}

.neighbours a:hover {
	border-color: var(--theme--primary);
}

.neighbours span {
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}

.next {
	margin-left: auto;
	text-align: right;
}
</style>
