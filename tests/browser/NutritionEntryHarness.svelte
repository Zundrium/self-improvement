<script lang="ts">
import { provideBottomActionBarState } from '$lib/components/app/action-bar-context.svelte';
import BottomActionBarOutlet from '$lib/components/app/BottomActionBarOutlet.svelte';
import NutritionEntry from '../../src/routes/nutrition/entry/[entryId]/+page.svelte';
import { Button } from '$lib/components/ui/button';
import type { NutritionEntry as Entry } from '$lib/api-types';
provideBottomActionBarState();

const base = {
	date: '2026-09-05',
	notes: '',
	thumbnail: '',
	totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, count: 0 },
	meals: []
};
let entry = $state<Entry>({
	...base,
	id: 'first',
	name: 'First meal',
	createdAt: '2026-09-05T12:00:00.000Z'
});
</script>

<Button profile="plain" size="small" onclick={() => (entry = { ...base, id: 'second', name: 'Second meal', createdAt: '2026-09-05T13:00:00.000Z' })}>Open second entry</Button>
<NutritionEntry data={{ entry }} params={{ entryId: entry.id }} />
<BottomActionBarOutlet />
