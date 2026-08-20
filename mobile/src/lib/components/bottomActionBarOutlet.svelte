<script lang="ts">
	import { page } from '$app/state';
	import { getTrackerColorsForPathname } from '$lib/trackers/registry';
	import { cn } from '$lib/utils';
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
		style={`--bottom-action-primary: ${primaryColor}; --bottom-action-secondary: ${secondaryColor}`}
		data-bottom-action-bar
	>
		<div class={cn('mx-auto w-full', state.actionBar.contentClass)}>
			{@render state.actionBar.children()}
		</div>
	</div>
{/if}

<style>
	@property --bottom-action-primary {
		syntax: '<color>';
		inherits: true;
		initial-value: #262626;
	}

	@property --bottom-action-secondary {
		syntax: '<color>';
		inherits: true;
		initial-value: #0d0d0d;
	}

	:global([data-bottom-action-bar] [data-slot='button']) {
		background: linear-gradient(
			135deg,
			var(--bottom-action-primary),
			var(--bottom-action-secondary)
		);
		color: #ffffff;
		transition:
			--bottom-action-primary 250ms ease,
			--bottom-action-secondary 250ms ease,
			filter 150ms ease,
			transform 200ms var(--ease-spring);
	}

	:global([data-bottom-action-bar] [data-slot='button']:hover) {
		color: #ffffff;
		filter: brightness(1.08);
	}
</style>
