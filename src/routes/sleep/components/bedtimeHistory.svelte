<script lang="ts">
	import { Check, Clock3, TriangleAlert } from '@lucide/svelte';
	import type { SleepAdherenceSummary } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { formatBedtime, formatUsageSeconds, statusLabel } from '../sleep';

	let {
		days,
		today,
		setupRequired
	}: { days: SleepAdherenceSummary[]; today: string; setupRequired: boolean } = $props();
	const colors = getTrackerColors('sleep');

	function badgeClass(status: SleepAdherenceSummary['status']) {
		if (setupRequired || status === 'pending') return 'bg-(--text)/8 text-(--text)/64';
		if (status === 'pass') return 'bg-(--status-success)/10 text-(--status-success-text)';
		return 'bg-(--status-warning)/10 text-(--status-warning-text)';
	}
</script>

<TrackerSection title="Last 7 days" description="Bedtime adherence by configured cutoff" {colors}>
	<div class="divide-y divide-(--text)/8">
		{#each days as day (day.localDate)}
			<div class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium">{shortDayLabel(day.localDate, today)}</p>
					<p class="mt-0.5 text-xs text-(--text)/40">
						{formatBedtime(day.configuredBedtime)} · {formatUsageSeconds(day.lateUsageSeconds)} late
					</p>
				</div>
				<Badge class={badgeClass(day.status)}>
					{#if !setupRequired && day.status === 'pass'}
						<Check class="size-3.5" />
					{:else if !setupRequired && day.status === 'fail'}
						<TriangleAlert class="size-3.5" />
					{:else}
						<Clock3 class="size-3.5" />
					{/if}
					{statusLabel(day.status, setupRequired)}
				</Badge>
			</div>
		{/each}
	</div>
</TrackerSection>
