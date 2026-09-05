<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { toast } from '$lib/components/ui/toast';
import { apiRequest } from '$lib/api';
import type { PeriodSettingsData } from '$lib/api-types';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
import { flowLabel, flowOptions, type MenstruationFlow } from '../period';
import type { PageProps } from './$types';
import { sameDraft, submittedSnapshot } from '$lib/forms/draft';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { data }: PageProps = $props();
let defaultFlow = $state<MenstruationFlow>(untrack(() => data.defaultFlow));
let fallbackCycleDays = $state(untrack(() => data.fallbackCycleDays));
let saving = $state(false);
let saved = $state(
	untrack(() => ({ defaultFlow: data.defaultFlow, fallbackCycleDays: data.fallbackCycleDays }))
);
const current = $derived({ defaultFlow, fallbackCycleDays });
const dirty = $derived(!sameDraft(current, saved));
guardUnsavedNavigation(() => dirty && !saving);
$effect(() => {
	const incoming = { defaultFlow: data.defaultFlow, fallbackCycleDays: data.fallbackCycleDays };
	if (!dirty && !saving && !sameDraft(incoming, saved)) {
		saved = incoming;
		defaultFlow = incoming.defaultFlow;
		fallbackCycleDays = incoming.fallbackCycleDays;
	}
});

async function saveSettings(event: SubmitEvent) {
	event.preventDefault();
	if (saving) return;
	saving = true;
	const submitted = submittedSnapshot(current);
	try {
		await apiRequest<PeriodSettingsData>('/api/app/period/settings', {
			method: 'PATCH',
			body: JSON.stringify(submitted)
		});
		saved = submitted;
		toast.success('Period settings updated.');
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() =>
			toast.error('Saved, but could not refresh the page.')
		);
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not update period settings.');
	} finally {
		saving = false;
	}
}
</script>

<svelte:head><title>Period settings · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-(--app-compact-max-width)" contentClass="space-y-5">
	<Card>
		<CardHeader><CardTitle>Cycle defaults</CardTitle></CardHeader>
		<CardContent>
			<Form id="period-settings" class="space-y-5" onsubmit={saveSettings}>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="period-default-flow">Default flow</FieldLabel>
					<Select type="single" bind:value={defaultFlow}>
						<SelectTrigger id="period-default-flow">{flowLabel(defaultFlow)}</SelectTrigger>
						<SelectContent>
							{#each flowOptions as option (option.value)}
								<SelectItem value={option.value}>{option.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</Field>
				<Field class="flex-row items-center justify-between gap-4">
					<FieldLabel for="fallback-cycle-days">Cycle length in days</FieldLabel>
					<Input
						id="fallback-cycle-days"
						class="w-20 text-center tabular-nums"
						type="number"
						min={15}
						max={60}
						bind:value={fallbackCycleDays}
						required
					/>
				</Field>
			</Form>
		</CardContent>
	</Card>
</TrackerPage>

<PageActionBar mobileOnly={false}>
<SettingsSaveBar form="period-settings" {saving} {dirty} backHref="/period" />
</PageActionBar>
