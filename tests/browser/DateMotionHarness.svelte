<script lang="ts">
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import TrackerProgressSection from '$lib/components/tracker/TrackerProgressSection.svelte';
import MetricStat from '$lib/components/metrics/MetricStat.svelte';
import { Drumstick } from '@lucide/svelte';
import { getTrackerColors } from '$lib/trackers/registry';
import { trackerProgressDays, type TrackerProgressMode } from '$lib/trackers/progress';
import { dateNavigationKey } from '$lib/motion/date-navigation';
import AnimatedValue from '$lib/components/metrics/AnimatedValue.svelte';

let { mode = 'line' }: { mode?: TrackerProgressMode } = $props();
let date = $state('2026-09-05');
const colors = getTrackerColors('nutrition');
const calories = $derived(date === '2026-09-05' ? 2000 : 1000);
const progressDays = $derived(
	trackerProgressDays(date, '2026-09-05', (day) =>
		mode === 'check' ? Number(day.endsWith('04')) : Number(day.slice(-2)) * 200
	)
);

export function select(next: string) {
	date = next;
}
</script>

{#key dateNavigationKey(`/nutrition/log/${date}`, null)}
	<TrackerPage progress={{ mode, days: progressDays, maxValue: 2500, ariaLabel: 'Five-day test progress' }}>
		<TrackerSection title="Summary">
			<TrackerProgressSection value={calories} max={2500} displayValue={calories.toLocaleString('en-US')} secondaryText="/ 2,500 kcal" label="Calories" {colors} />
			<MetricStat icon={Drumstick} value={`${calories / 100}g`} label="protein" />
			<label>Persistent input<input aria-label="Persistent input" /></label>
			<AnimatedValue value={calories / 20} format={(minutes) => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`} />
		</TrackerSection>
		{#if date !== '2026-09-05'}<TrackerSection title="Historical state"><p>Saved meals</p></TrackerSection>{/if}
	</TrackerPage>
{/key}
