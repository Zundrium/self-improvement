<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { SleepSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { androidSyncCoordinator } from '$native/android-data';
import { isNativeAndroid } from '$native/platform';
import { applyBedtimeReminder, requestBedtimeReminderPermission } from '../reminders';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { settings }: { settings: SleepSettingsData } = $props();
let loadedKey = $state(untrack(() => settingsKey(settings.bedtime, settings.remindersEnabled)));
let loadedRemindersEnabled = $state(untrack(() => settings.remindersEnabled));
let bedtime = $state(untrack(() => settings.bedtime));
let remindersEnabled = $state(untrack(() => settings.remindersEnabled));
let saving = $state(false);
const dirty = $derived(settingsKey(bedtime, remindersEnabled) !== loadedKey);
guardUnsavedNavigation(() => dirty && !saving);

$effect(() => syncSettings(settings.bedtime, settings.remindersEnabled));

function syncSettings(nextBedtime: string, nextRemindersEnabled: boolean) {
	const nextKey = settingsKey(nextBedtime, nextRemindersEnabled);
	if (loadedKey === nextKey) return;
	loadedKey = nextKey;
	loadedRemindersEnabled = nextRemindersEnabled;
	bedtime = nextBedtime;
	remindersEnabled = nextRemindersEnabled;
}

function settingsKey(bedtime: string, remindersEnabled: boolean) {
	return `${bedtime}:${remindersEnabled}`;
}

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	try {
		if (remindersEnabled && !loadedRemindersEnabled) {
			const granted = await requestBedtimeReminderPermission();
			if (!granted) {
				remindersEnabled = false;
				throw new Error('Notification permission is needed to enable bedtime reminders.');
			}
		}
		const submitted = { bedtime, remindersEnabled };
		const updated = await apiRequest<SleepSettingsData>('/api/app/sleep', {
			method: 'PATCH',
			body: JSON.stringify({
				...submitted,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
			})
		});
		loadedKey = settingsKey(submitted.bedtime, submitted.remindersEnabled);
		loadedRemindersEnabled = submitted.remindersEnabled;
		toast.success('Sleep settings updated.');
		try {
			await applyBedtimeReminder(updated);
			if (isNativeAndroid()) await androidSyncCoordinator.sync(['sleep']);
			await refreshAppData(APP_RESOURCES.bootstrap);
		} catch {
			toast.error('Saved, but device reminders could not be refreshed.');
		}
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

<PageActionBar mobileOnly={false}>
<SettingsSaveBar form="sleep-settings" {saving} {dirty} backHref="/sleep" />
</PageActionBar>
