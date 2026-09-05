<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { StepsSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { settings }: { settings: StepsSettingsData } = $props();
let dailyGoal = $state(untrack(() => settings.dailyGoal));
let saving = $state(false);
let savedDailyGoal = $state(untrack(() => settings.dailyGoal));
const dirty = $derived(dailyGoal !== savedDailyGoal);
guardUnsavedNavigation(() => dirty && !saving);
$effect(() => {
	if (!dirty && !saving && settings.dailyGoal !== savedDailyGoal)
		dailyGoal = savedDailyGoal = settings.dailyGoal;
});

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	const submitted = Number(dailyGoal);
	try {
		await apiRequest<StepsSettingsData>('/api/app/steps/settings', {
			method: 'PATCH',
			body: JSON.stringify({ dailyGoal: submitted })
		});
		savedDailyGoal = submitted;
		toast.success('Steps settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not update steps settings.');
	} finally {
		saving = false;
	}
}
</script>

<Card>
	<CardHeader><CardTitle>Daily goal</CardTitle></CardHeader>
	<CardContent>
		<Form id="steps-settings" class="space-y-0" onsubmit={saveSettings}>
			<Field class="flex-row items-center justify-between gap-4">
				<FieldLabel for="daily-goal">Steps per day</FieldLabel>
				<Input
					id="daily-goal"
					class="w-28 text-right tabular-nums"
					type="number"
					min={1000}
					max={100000}
					bind:value={dailyGoal}
					required
				/>
			</Field>
		</Form>
	</CardContent>
</Card>

<PageActionBar mobileOnly={false}>
<SettingsSaveBar form="steps-settings" {saving} {dirty} backHref="/steps" />
</PageActionBar>
