<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { toast } from '$lib/components/ui/toast';
	import type { ProfileData } from '$lib/api-types';
	import type { AppTrackerId } from '$lib/trackers/registry';

	type TrackerPreference = ProfileData['trackerPreferences'][number];
	let { trackers }: { trackers: TrackerPreference[] } = $props();
	let enabledTrackers = $state<AppTrackerId[]>(
		untrack(() => trackers.filter((tracker) => tracker.enabled).map((tracker) => tracker.id))
	);
	let savedTrackers = $state(untrack(() => [...enabledTrackers]));
	let message = $state('');
	let failed = $state(false);
	let saving = $state(false);
	const dirty = $derived(
		enabledTrackers.length !== savedTrackers.length ||
			enabledTrackers.some((trackerId) => !savedTrackers.includes(trackerId))
	);

	function toggleTracker(id: AppTrackerId, checked: boolean) {
		enabledTrackers = checked
			? [...new Set([...enabledTrackers, id])]
			: enabledTrackers.filter((trackerId) => trackerId !== id);
	}

	async function saveTrackers(event: SubmitEvent) {
		event.preventDefault();
		if (saving || !dirty) return;
		saving = true;
		try {
			await apiRequest('/api/app/profile', {
				method: 'PATCH',
				body: JSON.stringify({ trackers: enabledTrackers })
			});
			savedTrackers = [...enabledTrackers];
			failed = false;
			message = 'Tracker visibility updated.';
			toast.success(message);
			await invalidateAll();
		} catch (cause) {
			failed = true;
			message = cause instanceof Error ? cause.message : 'Could not update your trackers.';
		} finally {
			saving = false;
		}
	}
</script>

<form id="tracker-preferences" onsubmit={saveTrackers}>
	<Card>
		<CardHeader><CardTitle>Active trackers</CardTitle></CardHeader>
		<CardContent class="space-y-5">
			<p class="text-sm leading-6 text-(--text)/64">
				Choose which trackers appear in the app drawer. Tracker-specific options are available from
				the settings icon on each tracker.
			</p>
			{#if message}
				<Alert variant={failed ? 'destructive' : 'default'}>
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			{/if}
			<div class="divide-y divide-(--text)/8">
				{#each trackers as tracker (tracker.id)}
					<div class="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
						<Checkbox
							id="tracker-{tracker.id}"
							checked={enabledTrackers.includes(tracker.id)}
							onCheckedChange={(checked) => toggleTracker(tracker.id, checked)}
						/>
						<label class="min-w-0 flex-1 cursor-pointer" for="tracker-{tracker.id}">
							<span class="block text-sm font-medium">{tracker.label}</span>
							<span class="mt-0.5 block text-sm leading-5 text-(--text)/56">
								{tracker.description}
							</span>
						</label>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>
</form>

<SettingsSaveBar
	form="tracker-preferences"
	{saving}
	{dirty}
	contentClass="max-w-4xl"
/>
