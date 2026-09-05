<script lang="ts">
import { Form } from '$lib/components/ui/form';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { ChevronLeft, Save, Trash2 } from '@lucide/svelte';
import type { PageProps } from './$types';
import { localOperation } from '$lib/api';

import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { BottomActionButton, BottomActionGroup } from '$lib/components/ui/bottom-action-bar';
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import EntryEditor from '../../components/entryEditor.svelte';
import type { EditableMeal } from '../../draft';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import { toast } from '$lib/components/ui/toast';
import { draftFingerprint, draftFromEntry, snapshotDraft, type EntryDraft } from '../../draft';
import { onDestroy } from 'svelte';
import { RequestLifetime } from '../../workflow';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { data }: PageProps = $props();
let entityId = $state('');
let date = $state('');
let time = $state('');
let name = $state('');
let notes = $state('');
let formError = $state('');
let deleteDialogOpen = $state(false);
let meals = $state<EditableMeal[]>([]);
let saving = $state(false);
let deleting = $state(false);
let deleted = $state(false);
const mutation = new RequestLifetime();
let savedDraft = $state<EntryDraft | null>(null);
const currentDraft = $derived({ date, time, name, notes, meals });
const dirty = $derived(
	savedDraft !== null && draftFingerprint(currentDraft) !== draftFingerprint(savedDraft)
);
guardUnsavedNavigation(() => dirty && !saving && !deleting);

$effect(() => {
	if (data.entry.id === entityId) return;
	mutation.cancel();
	const next = draftFromEntry(data.entry);
	entityId = data.entry.id;
	date = next.date;
	time = next.time;
	name = next.name;
	notes = next.notes;
	meals = next.meals;
	savedDraft = snapshotDraft(next);
	formError = '';
	deleteDialogOpen = false;
	saving = false;
	deleting = false;
	deleted = false;
});

async function saveEntry(event: SubmitEvent) {
	event.preventDefault();
	if (saving || deleting) return;
	formError = '';
	saving = true;
	const submittedId = entityId;
	const submitted = snapshotDraft({ date, time, name, notes, meals });
	const request = mutation.begin(30_000);
	try {
		await localOperation('updateNutritionEntry', {
			entryId: submittedId,
			entry: {
				...submitted,
				timeZoneOffset: new Date(`${submitted.date}T${submitted.time}:00`).getTimezoneOffset()
			}
		});
		if (entityId !== submittedId || !mutation.isCurrent(request.id)) return;
		savedDraft = submitted;
		toast.success('Meal updated.');
		if (draftFingerprint(currentDraft) === draftFingerprint(submitted)) {
			await goto(resolve('/nutrition/log/[date]', { date: submitted.date }));
		}
	} catch (cause) {
		if (entityId !== submittedId || !mutation.isCurrent(request.id)) return;
		formError = cause instanceof Error ? cause.message : 'Could not save this meal.';
	} finally {
		request.finish();
		if (entityId === submittedId && mutation.isCurrent(request.id)) saving = false;
	}
}

function confirmDelete() {
	deleteDialogOpen = false;
	void deleteEntry();
}

async function deleteEntry() {
	if (saving || deleting) return;
	deleting = true;
	const submittedId = entityId;
	const request = mutation.begin(30_000);
	try {
		const result = await localOperation('deleteNutritionEntry', { entryId: submittedId });
		if (entityId !== submittedId || !mutation.isCurrent(request.id)) return;
		deleted = true;
		toast.success('Meal deleted.');
		try {
			await goto(resolve('/nutrition/log/[date]', { date: result.date }));
		} catch {
			formError = 'Meal deleted. Could not return to the food log.';
		}
	} catch (cause) {
		if (entityId !== submittedId || !mutation.isCurrent(request.id)) return;
		formError = cause instanceof Error ? cause.message : 'Could not delete this meal.';
	} finally {
		request.finish();
		if (entityId === submittedId && mutation.isCurrent(request.id)) deleting = false;
	}
}

onDestroy(() => mutation.cancel());
</script>

<svelte:head><title>Edit meal · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-4xl">
	<Form id="save-entry" onsubmit={saveEntry}>
		<EntryEditor bind:date bind:time bind:name bind:notes bind:meals error={formError} />
	</Form>
</TrackerPage>

<PageActionBar contentClass="max-w-4xl" mobileOnly={false}>
	<BottomActionGroup>
		<BottomActionButton href="/nutrition/log/{date}" format="icon" aria-label="Back to daily log">
			<ChevronLeft class="size-5" />
		</BottomActionButton>
		<BottomActionButton form="save-entry" type="submit" tone="primary" disabled={!dirty || saving || deleting || deleted}>
			<Save class="mr-2 size-4" /> Save meal
		</BottomActionButton>
		{#if !deleted}<AlertDialog bind:open={deleteDialogOpen}>
			<AlertDialogTrigger>
				{#snippet child({ props })}<BottomActionButton
						tone="destructive"
						expand={false}
						{...props}><Trash2 class="mr-2 size-4" /> Delete</BottomActionButton
					>{/snippet}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader
					><AlertDialogTitle>Delete this meal?</AlertDialogTitle><AlertDialogDescription
						>This removes the photo, nutrition estimate, and all detected ingredients. This cannot
						be undone.</AlertDialogDescription
					></AlertDialogHeader
				>
				<AlertDialogFooter
					><AlertDialogCancel size="medium">Cancel</AlertDialogCancel><AlertDialogAction
						size="medium"
						profile="plain"
						tone="destructive"
						onclick={confirmDelete} disabled={saving || deleting}>Delete meal</AlertDialogAction
					></AlertDialogFooter
				>
			</AlertDialogContent>
		</AlertDialog>{/if}
	</BottomActionGroup>
</PageActionBar>
