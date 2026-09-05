<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { MeditationSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { settings }: { settings: MeditationSettingsData } = $props();
let defaultDurationMinutes = $state(untrack(() => settings.defaultDurationSeconds / 60));
let saving = $state(false);
let savedDurationMinutes = $state(untrack(() => settings.defaultDurationSeconds / 60));
const dirty = $derived(defaultDurationMinutes !== savedDurationMinutes);
guardUnsavedNavigation(() => dirty && !saving);
$effect(() => {
	const incoming = settings.defaultDurationSeconds / 60;
	if (!dirty && !saving && incoming !== savedDurationMinutes)
		defaultDurationMinutes = savedDurationMinutes = incoming;
});

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	const submitted = Number(defaultDurationMinutes);
	try {
		await apiRequest<MeditationSettingsData>('/api/app/meditation/settings', {
			method: 'PATCH',
			body: JSON.stringify({ defaultDurationSeconds: submitted * 60 })
		});
		savedDurationMinutes = submitted;
		toast.success('Meditation settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not update meditation settings.');
	} finally {
		saving = false;
	}
}
</script>

<Card>
	<CardHeader><CardTitle>Session default</CardTitle></CardHeader>
	<CardContent>
		<Form id="meditation-settings" class="space-y-0" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="default-duration">Duration in minutes</FieldLabel>
				<Input
					id="default-duration"
					class="w-24 text-right tabular-nums"
					type="number"
					min={1}
					max={120}
					bind:value={defaultDurationMinutes}
					required
				/>
			</Field>
		</Form>
	</CardContent>
</Card>

<PageActionBar mobileOnly={false}>
<SettingsSaveBar form="meditation-settings" {saving} {dirty} backHref="/meditation" />
</PageActionBar>
