<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import type { PeriodData } from '$lib/api-types';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { BottomActionButton, BottomActionGroup } from '$lib/components/ui/bottom-action-bar';
import { Button } from '$lib/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
import { Textarea } from '$lib/components/ui/textarea';
import { getTrackerColors } from '$lib/trackers/registry';
import { flowLabel, flowOptions, type MenstruationFlow } from '../period';
import { submittedSnapshot } from '$lib/forms/draft';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { data }: { data: PeriodData } = $props();
const colors = getTrackerColors('period');
let errorMessage = $state('');
let saving = $state(false);
let loadedDate = $state(untrack(() => data.date));
let loadedUpdatedAt = $state(untrack(() => String(data.entry?.updatedAt ?? '')));
let loadedDefaultFlow = $state(untrack(() => data.settings.defaultFlow));
let flow = $state<MenstruationFlow>(untrack(() => data.entry?.flow ?? data.settings.defaultFlow));
let notes = $state(untrack(() => data.entry?.notes ?? ''));
let savedFlow = $state<MenstruationFlow | undefined>(untrack(() => data.entry?.flow));
let savedNotes = $state(untrack(() => data.entry?.notes ?? ''));
let hasSavedEntry = $state(untrack(() => Boolean(data.entry)));
const dirty = $derived(!hasSavedEntry || flow !== savedFlow || notes !== savedNotes);
guardUnsavedNavigation(() => dirty && !saving);

$effect(() => syncEntry(data));

function syncEntry(nextData: PeriodData) {
	const updatedAt = String(nextData.entry?.updatedAt ?? '');
	const defaultFlow = nextData.settings.defaultFlow;
	if (
		loadedDate === nextData.date &&
		loadedUpdatedAt === updatedAt &&
		loadedDefaultFlow === defaultFlow
	)
		return;
	const dateChanged = loadedDate !== nextData.date;
	loadedDate = nextData.date;
	loadedUpdatedAt = updatedAt;
	loadedDefaultFlow = defaultFlow;
	if (!dateChanged && dirty) {
		hasSavedEntry = Boolean(nextData.entry);
		savedFlow = nextData.entry?.flow;
		savedNotes = nextData.entry?.notes ?? '';
		return;
	}
	flow = nextData.entry?.flow ?? defaultFlow;
	notes = nextData.entry?.notes ?? '';
	markSaved(Boolean(nextData.entry));
}

async function saveEntry(event: SubmitEvent) {
	event.preventDefault();
	if (!dirty || saving) return;
	saving = true;
	errorMessage = '';
	const submitted = submittedSnapshot({ localDate: data.date, flow, notes });
	try {
		await apiRequest('/api/app/period', {
			method: 'PUT',
			body: JSON.stringify(submitted)
		});
		hasSavedEntry = true;
		savedFlow = submitted.flow;
		savedNotes = submitted.notes;
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() => {
			errorMessage = 'Saved, but could not refresh the page.';
		});
	} catch (cause) {
		errorMessage = cause instanceof Error ? cause.message : 'Could not save your entry.';
	} finally {
		saving = false;
	}
}

function markSaved(saved: boolean) {
	hasSavedEntry = saved;
	savedFlow = saved ? flow : undefined;
	savedNotes = saved ? notes : '';
}
</script>

<Form id="period-entry" class="space-y-5" onsubmit={saveEntry}>
	{#if errorMessage}
		<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
	{/if}
	<Field>
		<FieldLabel for="period-flow">Flow</FieldLabel>
		<Select type="single" name="flow" bind:value={flow}>
			<SelectTrigger id="period-flow" class="w-full">{flowLabel(flow)}</SelectTrigger>
			<SelectContent>
				{#each flowOptions as option (option.value)}
					<SelectItem value={option.value}>{option.label}</SelectItem>
				{/each}
			</SelectContent>
		</Select>
	</Field>
	<Field>
		<FieldLabel for="period-notes">Notes</FieldLabel>
		<Textarea
			id="period-notes"
			name="notes"
			bind:value={notes}
			maxlength={1000}
			rows={5}
			placeholder="Symptoms, medication, or anything you want to remember"
		/>
		<FieldDescription>Optional and private to your account.</FieldDescription>
	</Field>
</Form>

<PageActionBar contentClass="max-w-4xl" mobileOnly={false}>
	<BottomActionGroup>
		<BottomActionButton
			form="period-entry"
			type="submit"
			tone={dirty ? 'primary' : 'neutral'}
			disabled={!dirty || saving}
		>
			{saving ? 'Saving…' : dirty ? 'Save entry' : 'Saved'}
		</BottomActionButton>
	</BottomActionGroup>
</PageActionBar>
