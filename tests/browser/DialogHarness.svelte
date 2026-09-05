<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '$lib/components/ui/dialog';
let open = $state(false);
</script>

<Button profile="plain" size="medium" onclick={() => (open = true)}>Open details</Button>
<Dialog bind:open>
	<DialogContent>
		<DialogTitle>Long details</DialogTitle>
		<DialogDescription>All content should remain reachable.</DialogDescription>
		{#each Array.from({ length: 40 }, (_, index) => index) as index (index)}
			<p>Detail {index + 1}</p>
		{/each}
	</DialogContent>
</Dialog>
