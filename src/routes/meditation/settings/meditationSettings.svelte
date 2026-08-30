<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { MeditationSettingsData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { getTrackerColors } from '$lib/trackers/registry';

	let { settings }: { settings: MeditationSettingsData } = $props();
	const colors = getTrackerColors('meditation');
	let defaultDurationMinutes = $state(untrack(() => settings.defaultDurationSeconds / 60));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<MeditationSettingsData>('/api/app/meditation/settings', {
				method: 'PATCH',
				body: JSON.stringify({ defaultDurationSeconds: defaultDurationMinutes * 60 })
			});
			toast.success('Meditation settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update meditation settings.');
		} finally {
			saving = false;
		}
	}
</script>

<TrackerSection
	title="Session default"
	description="Choose the duration a new meditation session starts with."
	{colors}
>
	<form id="meditation-settings" class="space-y-6" onsubmit={saveSettings}>
		<Field class="max-w-xs">
			<FieldLabel for="default-duration">Default duration (minutes)</FieldLabel>
			<Input
				id="default-duration"
				type="number"
				min={1}
				max={120}
				bind:value={defaultDurationMinutes}
				required
			/>
			<FieldDescription>Set a duration from 1 minute to 2 hours.</FieldDescription>
		</Field>
	</form>
</TrackerSection>

<SettingsSaveBar form="meditation-settings" {saving} />
