<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { BreathingSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { sameDraft, submittedSnapshot } from '$lib/forms/draft';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { settings }: { settings: BreathingSettingsData } = $props();
let rounds = $state(untrack(() => settings.rounds));
let includeHold = $state(untrack(() => settings.includeHold));
let saving = $state(false);
let saved = $state(untrack(() => ({ rounds: settings.rounds, includeHold: settings.includeHold })));
const current = $derived({ rounds, includeHold });
const dirty = $derived(!sameDraft(current, saved));
guardUnsavedNavigation(() => dirty && !saving);
$effect(() => {
	const incoming = { rounds: settings.rounds, includeHold: settings.includeHold };
	if (!dirty && !saving && !sameDraft(incoming, saved)) {
		saved = incoming;
		rounds = incoming.rounds;
		includeHold = incoming.includeHold;
	}
});

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	const submitted = submittedSnapshot(current);
	try {
		await apiRequest<BreathingSettingsData>('/api/app/breathing/settings', {
			method: 'PATCH',
			body: JSON.stringify(submitted)
		});
		saved = submitted;
		toast.success('Breathing settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not update breathing settings.');
	} finally {
		saving = false;
	}
}
</script>

<Card>
	<CardHeader><CardTitle>Exercise defaults</CardTitle></CardHeader>
	<CardContent>
		<Form id="breathing-settings" class="space-y-5" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="breathing-rounds">Rounds</FieldLabel>
				<Input
					id="breathing-rounds"
					class="w-20 text-center tabular-nums"
					type="number"
					min={1}
					max={20}
					bind:value={rounds}
					required
				/>
			</Field>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="include-breath-hold">Include a breath hold</FieldLabel>
				<Checkbox id="include-breath-hold" bind:checked={includeHold} />
			</Field>
		</Form>
	</CardContent>
</Card>

<PageActionBar mobileOnly={false}>
<SettingsSaveBar form="breathing-settings" {saving} {dirty} backHref="/breathing" />
</PageActionBar>
