<script lang="ts">
	import { CircleAlert, Smartphone } from '@lucide/svelte';
	import type { SleepAdherenceSummary } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { formatUsageSeconds } from '../sleep';

	let { summary, setupRequired }: { summary: SleepAdherenceSummary; setupRequired: boolean } =
		$props();
	const colors = getTrackerColors('sleep');
</script>

<TrackerSection
	title="Late activity"
	description="Selected apps during the four hours after bedtime"
	{colors}
>
	{#if setupRequired}
		<Alert variant="destructive">
			<CircleAlert />
			<AlertTitle>Choose which apps count</AlertTitle>
			<AlertDescription>
				Sleep reuses the tracked-app list from Screen time. No bedtime day can pass or fail until at
				least one app is selected.
			</AlertDescription>
			<div class="col-start-2 mt-2">
				<Button href="/screen-time" size="small" variant="ghost">Choose tracked apps</Button>
			</div>
		</Alert>
	{:else if summary.violatingApps.length}
		<div class="space-y-2">
			{#each summary.violatingApps as app (app.package)}
				<div class="flex items-center gap-3 rounded-3xl bg-(--text)/5 px-4 py-3">
					<span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text)/6">
						<Smartphone class="size-4" />
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{app.name}</p>
						<p class="truncate text-xs text-(--text)/40">{app.package}</p>
					</div>
					<strong class="text-sm font-medium">{formatUsageSeconds(app.seconds)}</strong>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm leading-6 text-(--text)/56">No selected-app activity recorded.</p>
	{/if}
</TrackerSection>
