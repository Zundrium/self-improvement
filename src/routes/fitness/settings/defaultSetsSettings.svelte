<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { FitnessSettingsData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { getTrackerColors } from '$lib/trackers/registry';

	let { settings }: { settings: FitnessSettingsData } = $props();
	const colors = getTrackerColors('fitness');
	let defaultSets = $state(untrack(() => settings.defaultSets));
	let saving = $state(false);

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<FitnessSettingsData>('/api/app/fitness/settings', {
				method: 'PATCH',
				body: JSON.stringify({ defaultSets })
			});
			toast.success('Fitness settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update fitness settings.');
		} finally {
			saving = false;
		}
	}
</script>

<TrackerSection
	title="Workout defaults"
	description="Choose how many sets a new workout starts with."
	{colors}
>
	<Form id="fitness-settings" onsubmit={saveSettings}>
		<Field class="max-w-xs">
			<FieldLabel for="default-sets">Default sets</FieldLabel>
			<Input
				id="default-sets"
				type="number"
				min={1}
				max={10}
				bind:value={defaultSets}
				required
			/>
			<FieldDescription>
				Used up to the sets available for a workout; you can still adjust before starting.
			</FieldDescription>
		</Field>
	</Form>
</TrackerSection>

<SettingsSaveBar
	form="fitness-settings"
	{saving}
	backHref="/fitness"
	contentClass="max-w-6xl"
/>
