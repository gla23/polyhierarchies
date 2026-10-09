<script setup lang="ts">
import ExploreLink from '../components/ExploreLink.vue';
import { concepts } from './concepts';
</script>

<template>
	<article class="concept">
		<h1>Concepts</h1>
		<p class="lede">
			Ideas that come up in every UI here, each on a page of its own: what it is, a live example, how
			each UI in Explore handles it, and where it turns up out in the world. Every example links
			straight to the same view in Explore.
		</p>
		<ul class="cards">
			<li v-for="concept in concepts" :key="concept.id">
				<ExploreLink :to="{ page: concept.id }">
					<strong>{{ concept.title }}</strong>
					<span>{{ concept.summary }}</span>
				</ExploreLink>
			</li>
		</ul>
	</article>
</template>

<style scoped>
.cards {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 12px;
	margin: 24px 0 0;
	padding: 0;
	list-style: none;
}

.cards li + li {
	margin-top: 0;
}

.cards a {
	display: flex;
	flex-direction: column;
	gap: 4px;
	box-sizing: border-box;
	height: 100%;
	padding: 14px 16px;
	color: var(--theme--foreground);
	text-decoration: none;
	background: var(--theme--background-subdued);
	border: var(--theme--border-width) solid var(--theme--border-color-subdued);
	border-radius: var(--theme--border-radius);
}

.cards a:hover {
	border-color: var(--theme--primary);
}

.cards strong {
	color: var(--theme--foreground-accent);
}

.cards span {
	font-size: 14px;
	color: var(--theme--foreground-subdued);
}
</style>
