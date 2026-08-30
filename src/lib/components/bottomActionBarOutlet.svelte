<script lang="ts">
	import { cn } from '$lib/utils';
	import { pageEnter } from '$lib/motion/gsap';
	import { useBottomActionBarState } from './bottomActionBarState.svelte';

	const state = useBottomActionBarState();
</script>

{#if state.actionBar}
	<div
		class={cn(
			'app-gutter shrink-0 bg-(--bg) py-(--bottom-action-padding-block)',
			state.actionBar.mobileOnly && 'sm:hidden'
		)}
		use:pageEnter
		data-bottom-action-bar
	>
		<div class={cn('mx-auto w-full', state.actionBar.contentClass)}>
			{@render state.actionBar.children()}
		</div>
	</div>
{/if}
