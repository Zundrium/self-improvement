<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Save } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { apiRequest } from '$lib/api';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import TrackerPage from '$lib/components/trackerPage.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import { toast } from '$lib/components/ui/toast';
	import EntryEditor, { type EditableMeal } from '../components/entryEditor.svelte';

	let { data }: PageProps = $props();
	let date = $state(untrack(() => data.date));
	let time = $state(inputTime(new Date()));
	let name = $state('Meal');
	let notes = $state('');
	let meals = $state<EditableMeal[]>([newMeal()]);
	let formError = $state('');
	let saving = $state(false);
	let timeZoneOffset = $derived(new Date(`${date}T${time}:00`).getTimezoneOffset());

	async function saveEntry(event: SubmitEvent) {
		event.preventDefault();
		formError = '';
		saving = true;
		try {
			await apiRequest('/api/app/nutrition/entries', {
				method: 'POST',
				body: JSON.stringify({ date, time, timeZoneOffset, name, notes, meals })
			});
			toast.success('Meal added.');
			await goto(resolve('/nutrition/log/[date]', { date }));
		} catch (cause) {
			formError = cause instanceof Error ? cause.message : 'Could not save this meal.';
		} finally {
			saving = false;
		}
	}

	function newMeal(): EditableMeal {
		return {
			id: crypto.randomUUID(),
			name: 'Meal',
			ingredients: [
				{
					id: crypto.randomUUID(),
					name: '',
					quantity: 1,
					unit: 'serving',
					calories: 0,
					proteinG: 0,
					carbsG: 0,
					fatG: 0,
					notes: ''
				}
			]
		};
	}

	function inputTime(value: Date) {
		return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
	}
</script>

<svelte:head><title>Add meal · Self Improvement</title></svelte:head>

<TrackerPage class="max-w-4xl">
	<form id="create-entry" onsubmit={saveEntry}>
		<EntryEditor bind:date bind:time bind:name bind:notes bind:meals error={formError} />
	</form>
</TrackerPage>

<BottomActionBar contentClass="max-w-4xl" mobileOnly={false}>
	<Button form="create-entry" type="submit" size="lg" class="w-full" disabled={saving}>
		{#if saving}<Spinner class="mr-2 size-4" />{:else}<Save class="mr-2 size-4" />{/if}
		Save meal
	</Button>
</BottomActionBar>
