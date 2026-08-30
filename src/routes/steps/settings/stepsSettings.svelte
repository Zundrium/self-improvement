<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { StepsSettingsData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
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
	<Form id="steps-settings" onsubmit={saveSettings}>
		<Field class="max-w-xs">
			<FieldLabel for="daily-goal">Steps per day</FieldLabel>
			<Input id="daily-goal" type="number" min={1000} max={100000} bind:value={dailyGoal} required />
			<FieldDescription>Choose a goal between 1,000 and 100,000 steps.</FieldDescription>
		</Field>
	</Form>
</TrackerSection>

<SettingsSaveBar form="steps-settings" {saving} />
