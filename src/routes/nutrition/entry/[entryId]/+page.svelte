<script lang="ts">
	import { Form } from '$lib/components/ui/form';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Save, Trash2 } from '@lucide/svelte';
	import { onMount, untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { apiRequest } from '$lib/api';

	import TrackerPage from '$lib/components/trackerPage.svelte';
	import {
		BottomActionBar,
		BottomActionButton,
		BottomActionGroup
	} from '$lib/components/ui/bottom-action-bar';
	import EntryEditor, { type EditableMeal } from '../../components/entryEditor.svelte';
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

	let { data }: PageProps = $props();
	const initial = untrack(() => data.entry);
	let date = $state(initial.date);
	let time = $state('');
	let timeZoneOffset = $derived(time ? new Date(`${date}T${time}:00`).getTimezoneOffset() : 0);
	let name = $state(initial.name);
	let notes = $state(initial.notes);
	let formError = $state('');
	let deleteDialogOpen = $state(false);
	let meals = $state<EditableMeal[]>(
		initial.meals.map((meal) => ({
			id: meal.id,
			name: meal.name,
			imageDataUrl: meal.imageDataUrl,
			ingredients: meal.ingredients.map((item) => ({
				id: item.id,
				name: item.name,
				quantity: item.quantity,
				unit: item.unit,
				calories: item.calories,
				proteinG: item.proteinG,
				carbsG: item.carbsG,
				fatG: item.fatG,
				notes: item.notes
			}))
		}))
	);

	onMount(() => {
		time = inputTime(initial.createdAt);
	});

	async function saveEntry(event: SubmitEvent) {
		event.preventDefault();
		formError = '';
		try {
			await apiRequest(`/api/app/nutrition/entry/${initial.id}`, {
				method: 'PUT',
				body: JSON.stringify({ date, time, timeZoneOffset, name, notes, meals })
			});
			toast.success('Meal updated.');
			await goto(resolve('/nutrition/log/[date]', { date }));
		} catch (cause) {
			formError = cause instanceof Error ? cause.message : 'Could not save this meal.';
		}
	}

	function confirmDelete() {
		deleteDialogOpen = false;
		void deleteEntry();
	}

	async function deleteEntry() {
		try {
			const result = await apiRequest<{ date: string }>(`/api/app/nutrition/entry/${initial.id}`, {
				method: 'DELETE'
			});
			toast.success('Meal deleted.');
			await goto(resolve('/nutrition/log/[date]', { date: result.date }));
		} catch (cause) {
			formError = cause instanceof Error ? cause.message : 'Could not delete this meal.';
		}
	}

	function inputTime(value: Date | string) {
		const dateValue = new Date(value);
		return `${String(dateValue.getHours()).padStart(2, '0')}:${String(dateValue.getMinutes()).padStart(2, '0')}`;
	}
</script>

<svelte:head><title>Edit meal · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-4xl">
	<Form id="save-entry" onsubmit={saveEntry}>
		<EntryEditor bind:date bind:time bind:name bind:notes bind:meals error={formError} />
	</Form>
</TrackerPage>

<BottomActionBar contentClass="max-w-4xl" mobileOnly={false}>
	<BottomActionGroup>
		<BottomActionButton form="save-entry" type="submit" tone="primary">
			<Save class="mr-2 size-4" /> Save meal
		</BottomActionButton>
		<AlertDialog bind:open={deleteDialogOpen}>
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
					><AlertDialogCancel size="medium">Cancel</AlertDialogCancel><AlertDialogAction size="medium"
						class="bg-red-600 text-white hover:bg-red-700"
						onclick={confirmDelete}>Delete meal</AlertDialogAction
					></AlertDialogFooter
				>
			</AlertDialogContent>
		</AlertDialog>
	</BottomActionGroup>
</BottomActionBar>
