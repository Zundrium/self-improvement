<script lang="ts">
import { BottomActionBar } from '$lib/components/ui/bottom-action-bar/index';
import { useBottomActionBarState } from '$lib/components/app/action-bar-context.svelte';
const state = useBottomActionBarState();
</script>

{#if state.actionBar}
	<BottomActionBar contentClass={state.actionBar.contentClass} mobileOnly={state.actionBar.mobileOnly}>
		{@render state.actionBar.children()}
	</BottomActionBar>
{/if}
