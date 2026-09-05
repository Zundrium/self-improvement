<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import BottomActionBarOutlet from '$lib/components/app/BottomActionBarOutlet.svelte';
import { provideBottomActionBarState } from '$lib/components/app/action-bar-context.svelte';
import { Button } from '$lib/components/ui/button';
provideBottomActionBarState();
let nested = $state(false);
</script>

<Button profile="plain" size="medium" onclick={() => (nested = !nested)}>Toggle workflow</Button>
<PageActionBar mobileOnly={false}><p>Parent actions</p></PageActionBar>
{#if nested}
	<PageActionBar mobileOnly={false}><p>Workflow actions</p></PageActionBar>
{/if}
<BottomActionBarOutlet />
