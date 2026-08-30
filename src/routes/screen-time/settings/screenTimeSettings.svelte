<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { ScreenTimeSettingsData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { getTrackerColors } from '$lib/trackers/registry';

	let { settings }: { settings: ScreenTimeSettingsData } = $props();
	const colors = getTrackerColors('screen-time');
	let dailyLimitMinutes = $state(untrack(() => settings.dailyLimitMinutes));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<ScreenTimeSettingsData>('/api/app/screen-time/settings', {
				method: 'PATCH',
				body: JSON.stringify({ dailyLimitMinutes })
			});
			toast.success('Screen time settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update screen time settings.');
		} finally {
			saving = false;
		}
	}
</script>

<TrackerSection
	title="Daily limit"
	description="Set the amount of tracked screen time you want to stay within."
	{colors}
>
	<Form id="screen-time-settings" onsubmit={saveSettings}>
		<Field class="max-w-xs">
			<FieldLabel for="daily-limit">Minutes per day</FieldLabel>
			<Input
				id="daily-limit"
				type="number"
				min={1}
				max={1440}
				bind:value={dailyLimitMinutes}
				required
			/>
			<FieldDescription>Choose a limit from 1 minute to 24 hours.</FieldDescription>
		</Field>
	</Form>
</TrackerSection>

<SettingsSaveBar form="screen-time-settings" {saving} backHref="/screen-time" />
