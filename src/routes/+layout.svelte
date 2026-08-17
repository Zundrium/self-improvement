<script lang="ts">
	import '@fontsource-variable/ibm-plex-sans';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppNavbar from '$lib/components/app-navbar.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
{#if data.user}
	<AppNavbar user={data.user} />
{/if}
<Toaster
	position="bottom-center"
	richColors
	offset={data.user ? { bottom: 'calc(5rem + env(safe-area-inset-bottom))' } : undefined}
/>
