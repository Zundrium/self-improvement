<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { FitnessSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { settings }: { settings: FitnessSettingsData } = $props();
let defaultSets = $state(untrack(() => settings.defaultSets));
let saving = $state(false);
let savedDefaultSets = $state(untrack(() => settings.defaultSets));
const dirty = $derived(defaultSets !== savedDefaultSets);
guardUnsavedNavigation(() => dirty && !saving);
$effect(() => {
	if (!dirty && !saving && settings.defaultSets !== savedDefaultSets)
		defaultSets = savedDefaultSets = settings.defaultSets;
});

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	const submitted = Number(defaultSets);
	try {
		await apiRequest<FitnessSettingsData>('/api/app/fitness/settings', {
			method: 'PATCH',
			body: JSON.stringify({ defaultSets: submitted })
		});
		savedDefaultSets = submitted;
		toast.success('Fitness settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not update fitness settings.');
	} finally {
		saving = false;
	}
}
</script>

<Card>
	<CardHeader>
		<CardTitle>Workout defaults</CardTitle>
	</CardHeader>
	<CardContent>
		<Form id="fitness-settings" class="space-y-0" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="default-sets">Default set amount</FieldLabel>
				<Input
					id="default-sets"
					class="w-20 text-center tabular-nums"
					type="number"
					min={1}
					max={10}
					bind:value={defaultSets}
					required
				/>
			</Field>
		</Form>
	</CardContent>
</Card>

<PageActionBar mobileOnly={false} contentClass="max-w-5xl">
<SettingsSaveBar form="fitness-settings" {saving} {dirty} backHref="/fitness" />
</PageActionBar>
