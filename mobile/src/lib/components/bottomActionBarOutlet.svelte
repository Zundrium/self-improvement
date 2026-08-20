<script lang="ts">
	import { cn } from '$lib/utils';
	import { useBottomActionBarState } from './bottomActionBarState.svelte';

	const state = useBottomActionBarState();
</script>

{#if state.actionBar}
	<div
		class={cn('shrink-0 bg-(--bg) px-4 py-3', state.actionBar.mobileOnly && 'sm:hidden')}
		data-bottom-action-bar
	>
		<div class={cn('mx-auto w-full', state.actionBar.contentClass)}>
			{@render state.actionBar.children()}
		</div>
	</div>
{/if}
