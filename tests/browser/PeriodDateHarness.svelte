<script lang="ts">
import { provideBottomActionBarState } from '$lib/components/app/action-bar-context.svelte';
import BottomActionBarOutlet from '$lib/components/app/BottomActionBarOutlet.svelte';
import PeriodEntrySection from '../../src/routes/period/components/periodEntrySection.svelte';

provideBottomActionBarState();
let date = $state('2026-09-05');
export function select(next: string) {
	date = next;
}
</script>

<PeriodEntrySection data={{ date, today: '2026-09-05', progressDays: [], settings: { defaultFlow: 'light', fallbackCycleDays: 28 }, entry: null, recentEntries: [], cycle: null }} />
<BottomActionBarOutlet />
