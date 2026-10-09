import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [vue()],
	// Relative, so the build works from GitHub Pages' /polyhierarchies/ as well as from the root
	base: './'
});
