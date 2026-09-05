<script lang="ts">
import { provideBottomActionBarState } from '$lib/components/app/action-bar-context.svelte';
import BottomActionBarOutlet from '$lib/components/app/BottomActionBarOutlet.svelte';
import NutritionTrack from '../../src/routes/nutrition/track/+page.svelte';
provideBottomActionBarState();
</script>

<NutritionTrack data={{ date: '2026-09-05' }} params={{}} />
<BottomActionBarOutlet />
