<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Save, Trash2 } from '@lucide/svelte';
	import { onMount, untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { apiRequest } from '$lib/api';

	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
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

	let { data }: PageProps = $props();
	const initial = untrack(() => data.entry);
	let date = $state(initial.date);
	let time = $state('');
	let timeZoneOffset = $derived(time ? new Date(`${date}T${time}:00`).getTimezoneOffset() : 0);
	let name = $state(initial.name);
	let notes = $state(initial.notes);
	let formError = $state('');
	let meals = $state<EditableMeal[]>(
		initial.meals.map((meal) => ({
			id: meal.id,
			name: meal.name,
			notes: meal.notes,
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
			await goto(resolve('/nutrition/log/[date]', { date }));
		} catch (cause) {
			formError = cause instanceof Error ? cause.message : 'Could not save this meal.';
		}
	}

	async function deleteEntry() {
		try {
			const result = await apiRequest<{ date: string }>(`/api/app/nutrition/entry/${initial.id}`, {
				method: 'DELETE'
			});
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

<svelte:head><title>Review meal · Self Improvement</title></svelte:head>

<main class="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
	<form id="save-entry" onsubmit={saveEntry}>
		<EntryEditor
			entryId={initial.id}
			bind:date
			bind:time
			bind:name
			bind:notes
			bind:meals
			error={formError}
		/>
	</form>
</main>

<BottomActionBar contentClass="max-w-4xl" mobileOnly={false}>
	<div class="flex gap-2">
		<Button form="save-entry" type="submit" size="lg" class="flex-1"
			><Save class="mr-2 size-4" /> Save meal</Button
		>
		<AlertDialog>
			<AlertDialogTrigger>
				{#snippet child({ props })}<Button variant="destructive" size="lg" {...props}
						><Trash2 class="mr-2 size-4" /> Delete</Button
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
					><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction
						class="bg-red-600 text-white hover:bg-red-700"
						onclick={deleteEntry}>Delete meal</AlertDialogAction
					></AlertDialogFooter
				>
			</AlertDialogContent>
		</AlertDialog>
	</div>
</BottomActionBar>
