<script lang="ts">
	import { page } from '$app/state';
	import { getTrackerColorsForPathname } from '$lib/trackers/registry';
	import { cn } from '$lib/utils';
	import { gradientColors, pageEnter } from '$lib/motion/gsap';
	import { useBottomActionBarState } from './bottomActionBarState.svelte';

	const state = useBottomActionBarState();
	const colors = $derived(getTrackerColorsForPathname(page.url.pathname));
	const primaryColor = $derived(colors?.primary ?? '#262626');
	const secondaryColor = $derived(colors?.secondary ?? '#0d0d0d');
</script>

{#if state.actionBar}
	<div
		class={cn(
			'app-gutter shrink-0 bg-(--bg) py-(--app-bar-padding-block)',
			state.actionBar.mobileOnly && 'sm:hidden'
		)}
		use:gradientColors={{ primary: primaryColor, secondary: secondaryColor }}
		use:pageEnter
		data-bottom-action-bar
	>
		<div class={cn('mx-auto w-full', state.actionBar.contentClass)}>
			{@render state.actionBar.children()}
		</div>
	</div>
{/if}

<style>
	:global([data-bottom-action-bar] [data-slot='button']) {
		background: linear-gradient(135deg, var(--motion-primary), var(--motion-secondary));
		color: #ffffff;
	}

	:global([data-bottom-action-bar] [data-slot='button']:hover) {
		color: #ffffff;
		filter: brightness(1.08);
	}
</style>
