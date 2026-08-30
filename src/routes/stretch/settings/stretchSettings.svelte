<script lang="ts">
	import { Form } from '$lib/components/ui/form';
import { invalidateAll } from '$app/navigation';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { StretchSettingsData } from '$lib/api-types';
import TrackerSection from '$lib/components/trackerSection.svelte';
import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { getTrackerColors } from '$lib/trackers/registry';
import { formatStretchDuration, stretchDurationSeconds } from '../stretch';

let { settings }: { settings: StretchSettingsData } = $props();
const colors = getTrackerColors('stretch');
let holdSeconds = $state(untrack(() => settings.holdSeconds));
let saving = $state(false);
const duration = $derived(formatStretchDuration(stretchDurationSeconds(holdSeconds)));

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	try {
		await updateSettings();
		toast.success('Stretch settings updated.');
		await invalidateAll();
	} catch (cause) {
		showError(cause);
	} finally {
		saving = false;
	}
}

function updateSettings() {
	return apiRequest<StretchSettingsData>('/api/app/stretch/settings', {
		method: 'PATCH',
		body: JSON.stringify({ holdSeconds })
	});
}

function showError(cause: unknown) {
	const message = cause instanceof Error ? cause.message : 'Could not update stretch settings.';
	toast.error(message);
}
</script>

<TrackerSection
	title="Routine pace"
	description="Choose the hold length for each of the two daily sets. The source video recommends 30 seconds."
	{colors}
>
	<Form id="stretch-settings" onsubmit={saveSettings}>
		<Field class="max-w-xs">
			<FieldLabel for="stretch-hold-seconds">Hold duration (seconds)</FieldLabel>
			<Input
				id="stretch-hold-seconds"
				type="number"
				min={5}
				max={600}
				step={5}
				bind:value={holdSeconds}
				required
			/>
			<FieldDescription>Timed holds take {duration}, followed by wall angels.</FieldDescription>
		</Field>
	</Form>
</TrackerSection>

<SettingsSaveBar form="stretch-settings" {saving} backHref="/stretch" />
