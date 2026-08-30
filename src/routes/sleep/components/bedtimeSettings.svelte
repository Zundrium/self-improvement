<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from '$lib/components/ui/toast';
	import { apiRequest } from '$lib/api';
	import type { SleepSettingsData } from '$lib/api-types';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldLabel } from '$lib/components/ui/field';
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

<Form id="sleep-settings" class="space-y-5" onsubmit={saveSettings}>
	<Field class="flex-row items-center justify-between gap-4">
		<FieldLabel for="bedtime">Bedtime</FieldLabel>
		<Input
			id="bedtime"
			name="bedtime"
			class="w-32 tabular-nums"
			type="time"
			bind:value={bedtime}
			required
		/>
	</Field>
	<Field class="flex-row items-center justify-between gap-4">
		<FieldLabel for="bedtime-reminders">Bedtime reminder</FieldLabel>
		<Checkbox id="bedtime-reminders" bind:checked={remindersEnabled} />
	</Field>
</Form>

<SettingsSaveBar form="sleep-settings" {saving} backHref="/sleep" />
