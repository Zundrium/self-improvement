<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { apiRequest } from '$lib/api';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { toast } from 'svelte-sonner';
	import ScreenTimeAppItem from './screenTimeAppItem.svelte';

	type App = { package: string; name: string; icon?: string };
	type KnownApp = App & { tracked: boolean };
	type AppUsage = App & { minutes: number };
	type Props = { apps: AppUsage[]; knownApps: KnownApp[] };

	let { apps, knownApps }: Props = $props();
	let pendingPackage = $state<string>();
	const colors = getTrackerColors('screen-time');
	const trackedApps = $derived(knownApps.filter((app) => app.tracked));
	const untrackedApps = $derived(knownApps.filter((app) => !app.tracked));
	const usageByPackage = $derived(new Map(apps.map((app) => [app.package, app.minutes])));

	async function setTracked(app: App, tracked: boolean) {
		pendingPackage = app.package;
		try {
			await saveTrackedChoice(app.package, tracked);
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update tracked apps.');
		} finally {
			pendingPackage = undefined;
		}
	}

	function saveTrackedChoice(packageName: string, tracked: boolean) {
		return apiRequest('/api/app/screen-time', {
			method: 'PATCH',
			body: JSON.stringify({ package: packageName, tracked })
		});
	}
</script>

<TrackerSection
	title="Tracked apps"
	description="Only these apps count toward screen time"
	{colors}
>
	{#if trackedApps.length}
		<div class="space-y-2">
			{#each trackedApps as app (app.package)}
				<ScreenTimeAppItem
					{app}
					tracked
					minutes={usageByPackage.get(app.package) ?? 0}
					pending={pendingPackage === app.package}
					onchange={setTracked}
				/>
			{/each}
		</div>
	{:else}
		<p class="text-sm leading-6 text-(--text)/56">Add apps below to begin measuring screen time.</p>
	{/if}
</TrackerSection>

<TrackerSection
	title="Untracked apps"
	description="Apps found in your recent Android usage"
	{colors}
>
	{#if untrackedApps.length}
		<div class="space-y-2">
			{#each untrackedApps as app (app.package)}
				<ScreenTimeAppItem
					{app}
					tracked={false}
					pending={pendingPackage === app.package}
					onchange={setTracked}
				/>
			{/each}
		</div>
	{:else}
		<p class="text-sm leading-6 text-(--text)/56">No untracked apps were found.</p>
	{/if}
</TrackerSection>
