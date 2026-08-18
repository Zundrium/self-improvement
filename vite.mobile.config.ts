import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const fromProjectRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	root: fromProjectRoot('./mobile'),
	plugins: [
		tailwindcss(),
		svelte({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			}
		})
	],
	resolve: {
		alias: {
			$lib: fromProjectRoot('./src/lib')
		}
	},
	server: {
		port: 5173,
		strictPort: true
	},
	build: {
		outDir: fromProjectRoot('./dist-mobile'),
		emptyOutDir: true
	}
});
