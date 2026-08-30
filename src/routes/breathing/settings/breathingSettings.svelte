<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { BreathingSettingsData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { breathingDurationSeconds, formatTimer } from '../breathing';

	let { settings }: { settings: BreathingSettingsData } = $props();
	const colors = getTrackerColors('breathing');
	let rounds = $state(untrack(() => settings.rounds));
	let includeHold = $state(untrack(() => settings.includeHold));
	let saving = $state(false);
	const duration = $derived(formatTimer(breathingDurationSeconds(includeHold, rounds)));

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			await apiRequest<BreathingSettingsData>('/api/app/breathing/settings', {
				method: 'PATCH',
				body: JSON.stringify({ rounds, includeHold })
			});
			toast.success('Breathing settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update breathing settings.');
		} finally {
			saving = false;
		}
	}
</script>

<TrackerSection
	title="Exercise defaults"
	description="Choose how each guided breathing exercise is paced."
	{colors}
>
	<Form id="breathing-settings" onsubmit={saveSettings}>
		<Field class="max-w-xs">
			<FieldLabel for="breathing-rounds">Rounds</FieldLabel>
			<Input id="breathing-rounds" type="number" min={1} max={20} bind:value={rounds} required />
			<FieldDescription>{rounds} rounds take {duration}.</FieldDescription>
		</Field>
		<Field>
			<label class="flex cursor-pointer items-center gap-3 text-sm font-medium">
				<Checkbox bind:checked={includeHold} />
				Include a breath hold
			</label>
			<FieldDescription>Use the 4–7–8 pattern instead of 4–8 breathing.</FieldDescription>
		</Field>
	</Form>
</TrackerSection>

<SettingsSaveBar form="breathing-settings" {saving} backHref="/breathing" />
