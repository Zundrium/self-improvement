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
{#if data.user}
	<AppNavbar user={data.user} />
{/if}
{@render children()}
<Toaster position="bottom-center" richColors />
