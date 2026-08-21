<script lang="ts">
	import { Progress } from '$lib/components/ui/progress';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { formatScreenTime } from '../screen-time';

	type AppUsage = { package: string; name: string; minutes: number };
	let { apps, totalMinutes }: { apps: AppUsage[]; totalMinutes: number } = $props();
	const colors = getTrackerColors('screen-time');
	const progressMax = $derived(Math.max(1, totalMinutes));
</script>

<TrackerSection title="Top apps" description="Usage for the selected day" {colors}>
	{#if apps.length}
		<div class="space-y-5">
			{#each apps as app (app.package)}
				<div class="space-y-2">
					<div class="flex items-start justify-between gap-4 text-sm">
						<div class="min-w-0">
							<p class="truncate font-medium">{app.name}</p>
							{#if app.name !== app.package}
								<p class="truncate text-xs text-(--text)/40">{app.package}</p>
							{/if}
						</div>
						<span class="shrink-0 text-(--text)/64 tabular-nums">
							{formatScreenTime(app.minutes)}
						</span>
					</div>
					<Progress
						value={app.minutes}
						max={progressMax}
						indicatorStyle={`background: ${colors.primary}`}
						aria-label={`${app.name}: ${formatScreenTime(app.minutes)}`}
					/>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm leading-6 text-(--text)/56">No app usage was recorded for this day.</p>
	{/if}
</TrackerSection>
