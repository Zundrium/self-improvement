<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { apiRequest } from '$lib/api';
	import type { BreathingSettingsData } from '$lib/api-types';
	import TrackerSection from '$lib/components/trackerSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { breathingDurationSeconds, formatTimer } from '../breathing';

	let { settings, trailing }: { settings: BreathingSettingsData; trailing?: Snippet } = $props();
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
	{trailing}
>
	<form class="space-y-6" onsubmit={saveSettings}>
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
		<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
	</form>
</TrackerSection>
