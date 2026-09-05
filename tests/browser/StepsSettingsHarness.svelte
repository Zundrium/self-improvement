<script lang="ts">
import { provideBottomActionBarState } from '$lib/components/app/action-bar-context.svelte';
import BottomActionBarOutlet from '$lib/components/app/BottomActionBarOutlet.svelte';
import StepsSettings from '../../src/routes/steps/settings/stepsSettings.svelte';
import { Button } from '$lib/components/ui/button';
provideBottomActionBarState();
let dailyGoal = $state(5000);
</script>

<Button profile="plain" size="small" onclick={() => (dailyGoal = 7000)}>Load updated settings</Button>
<StepsSettings settings={{ dailyGoal }} />
<BottomActionBarOutlet />
