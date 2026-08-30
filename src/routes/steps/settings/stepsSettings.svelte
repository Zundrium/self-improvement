<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { StepsSettingsData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { getTrackerColors } from '$lib/trackers/registry';

	let { settings }: { settings: StepsSettingsData } = $props();
	const colors = getTrackerColors('steps');
	let dailyGoal = $state(untrack(() => settings.dailyGoal));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<StepsSettingsData>('/api/app/steps/settings', {
				method: 'PATCH',
				body: JSON.stringify({ dailyGoal })
			});
			toast.success('Steps settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update steps settings.');
		} finally {
			saving = false;
		}
	}
</script>

<TrackerSection
	title="Daily goal"
	description="Set the number of steps you want to reach each day."
	{colors}
>
	<form class="space-y-6" onsubmit={saveSettings}>
		<Field class="max-w-xs">
			<FieldLabel for="daily-goal">Steps per day</FieldLabel>
			<Input id="daily-goal" type="number" min={1000} max={100000} bind:value={dailyGoal} required />
			<FieldDescription>Choose a goal between 1,000 and 100,000 steps.</FieldDescription>
		</Field>
		<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
	</form>
</TrackerSection>
