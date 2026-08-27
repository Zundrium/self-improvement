<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import type { PeriodData } from '$lib/api-types';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getTrackerColors } from '$lib/trackers/registry';
	import { flowLabel, flowOptions, type MenstruationFlow } from '../period';

	let { data }: { data: PeriodData } = $props();
	const colors = getTrackerColors('period');
	let errorMessage = $state('');
	let saving = $state(false);
	let loadedDate = $state(untrack(() => data.date));
	let loadedUpdatedAt = $state(untrack(() => String(data.entry?.updatedAt ?? '')));
	let flow = $state<MenstruationFlow>(untrack(() => data.entry?.flow ?? 'medium'));
	let notes = $state(untrack(() => data.entry?.notes ?? ''));
	let savedFlow = $state<MenstruationFlow | undefined>(untrack(() => data.entry?.flow));
	let savedNotes = $state(untrack(() => data.entry?.notes ?? ''));
	let hasSavedEntry = $state(untrack(() => Boolean(data.entry)));
	const dirty = $derived(!hasSavedEntry || flow !== savedFlow || notes !== savedNotes);

	$effect(() => syncEntry(data));

	function syncEntry(nextData: PeriodData) {
		const updatedAt = String(nextData.entry?.updatedAt ?? '');
		if (loadedDate === nextData.date && loadedUpdatedAt === updatedAt) return;
		loadedDate = nextData.date;
		loadedUpdatedAt = updatedAt;
		flow = nextData.entry?.flow ?? 'medium';
		notes = nextData.entry?.notes ?? '';
		markSaved(Boolean(nextData.entry));
	}

	async function saveEntry(event: SubmitEvent) {
		event.preventDefault();
		if (!dirty || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await apiRequest('/api/app/period', {
				method: 'PUT',
				body: JSON.stringify({ localDate: data.date, flow, notes })
			});
			markSaved(true);
			await invalidateAll();
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

<form id="period-entry" class="space-y-5" onsubmit={saveEntry}>
	{#if errorMessage}
		<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
	{/if}
	<Field>
		<FieldLabel>Flow</FieldLabel>
		<Select type="single" name="flow" bind:value={flow}>
			<SelectTrigger class="w-full">{flowLabel(flow)}</SelectTrigger>
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
</form>

<BottomActionBar contentClass="max-w-4xl" mobileOnly={false}>
	<Button
		form="period-entry"
		type="submit"
		size="lg"
		variant={dirty ? 'default' : 'ghost'}
		class="w-full {dirty ? 'text-white' : ''}"
		style={dirty
			? `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
			: undefined}
		disabled={!dirty || saving}
	>
		{saving ? 'Saving…' : dirty ? 'Save entry' : 'Saved'}
	</Button>
</BottomActionBar>
