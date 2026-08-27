<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { SleepSettingsData } from '$lib/api-types';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { androidSyncCoordinator } from '$native/android-data';
	import { isNativeAndroid } from '$native/platform';
	import { applyBedtimeReminder, requestBedtimeReminderPermission } from '../reminders';

	let { settings }: { settings: SleepSettingsData } = $props();
	let loadedSettings = $state(untrack(() => settings));
	let bedtime = $state(untrack(() => settings.bedtime));
	let remindersEnabled = $state(untrack(() => settings.remindersEnabled));
	let saving = $state(false);

	$effect(() => {
		if (loadedSettings === settings) return;
		loadedSettings = settings;
		bedtime = settings.bedtime;
		remindersEnabled = settings.remindersEnabled;
	});

	async function saveSettings(event: SubmitEvent) {
		event.preventDefault();
		if (saving) return;
		saving = true;
		try {
			if (remindersEnabled && !loadedSettings.remindersEnabled) {
				const granted = await requestBedtimeReminderPermission();
				if (!granted) {
					remindersEnabled = false;
					throw new Error('Notification permission is needed to enable bedtime reminders.');
				}
			}
			const updated = await apiRequest<SleepSettingsData>('/api/app/sleep', {
				method: 'PATCH',
				body: JSON.stringify({
					bedtime,
					remindersEnabled,
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
				})
			});
			await applyBedtimeReminder(updated);
			if (isNativeAndroid()) await androidSyncCoordinator.sync(['sleep']);
			toast.success('Sleep settings updated.');
			await invalidateAll();
		} catch (cause) {
			toast.error(cause instanceof Error ? cause.message : 'Could not update sleep settings.');
		} finally {
			saving = false;
		}
	}
</script>

<form class="space-y-6" onsubmit={saveSettings}>
	<Field>
		<FieldLabel for="bedtime">Bedtime</FieldLabel>
		<Input id="bedtime" name="bedtime" type="time" bind:value={bedtime} required />
		<FieldDescription>
			Selected-app activity is checked for four hours after this time.
		</FieldDescription>
	</Field>

	<div class="flex items-start gap-3 rounded-3xl bg-(--text)/5 p-4">
		<Checkbox id="bedtime-reminders" bind:checked={remindersEnabled} />
		<label class="min-w-0 flex-1 cursor-pointer" for="bedtime-reminders">
			<span class="block text-sm font-medium">Bedtime reminder</span>
			<span class="mt-0.5 block text-xs leading-5 text-(--text)/48">
				Notify me 15 minutes before bedtime.
			</span>
		</label>
	</div>

	<Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</Button>
</form>
