<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import type { HappinessData } from '$lib/api-types';
	import BottomActionBar from '$lib/components/bottomActionBar.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { getTrackerColors } from '$lib/trackers/registry';
	import {
		happinessLabel,
		happinessRatings,
		reasonOptionsForRating,
		type HappinessRating,
		type HappinessReason
	} from '../happiness';

	let { data }: { data: HappinessData } = $props();
	const colors = getTrackerColors('happiness');
	let errorMessage = $state('');
	let saving = $state(false);
	let loadedDate = $state(untrack(() => data.date));
	let loadedUpdatedAt = $state(untrack(() => String(data.entry?.updatedAt ?? '')));
	let loadedDefaultRating = $state(untrack(() => data.settings.defaultRating));
	let rating = $state<HappinessRating>(
		untrack(() => data.entry?.rating ?? data.settings.defaultRating)
	);
	let selectedReasons = $state<string[]>(untrack(() => data.entry?.reasons ?? []));
	let savedRating = $state<HappinessRating | undefined>(untrack(() => data.entry?.rating));
	let savedReasons = $state<string[]>(untrack(() => data.entry?.reasons ?? []));
	let hasSavedEntry = $state(untrack(() => Boolean(data.entry)));
	const reasonOptions = $derived(reasonOptionsForRating(rating));
	const dirty = $derived(
		!hasSavedEntry || rating !== savedRating || reasonKey(selectedReasons) !== reasonKey(savedReasons)
	);

	$effect(() => syncEntry(data));

	function syncEntry(nextData: HappinessData) {
		const updatedAt = String(nextData.entry?.updatedAt ?? '');
		const defaultRating = nextData.settings.defaultRating;
		if (
			loadedDate === nextData.date &&
			loadedUpdatedAt === updatedAt &&
			loadedDefaultRating === defaultRating
		)
			return;
		loadedDate = nextData.date;
		loadedUpdatedAt = updatedAt;
		loadedDefaultRating = defaultRating;
		rating = nextData.entry?.rating ?? defaultRating;
		selectedReasons = nextData.entry?.reasons ?? [];
		markSaved(Boolean(nextData.entry));
	}

	function chooseRating(value: HappinessRating) {
		rating = value;
		const validReasons = new Set<string>(reasonOptionsForRating(value).map((option) => option.value));
		selectedReasons = selectedReasons.filter((reason) => validReasons.has(reason));
	}

	function updateReason(reason: HappinessReason, checked: boolean) {
		selectedReasons = checked
			? [...new Set([...selectedReasons, reason])]
			: selectedReasons.filter((value) => value !== reason);
	}

	async function saveEntry(event: SubmitEvent) {
		event.preventDefault();
		if (!dirty || saving) return;
		saving = true;
		errorMessage = '';
		try {
			await apiRequest('/api/app/happiness', {
				method: 'PUT',
				body: JSON.stringify({ localDate: data.date, rating, reasons: selectedReasons })
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
		savedRating = saved ? rating : undefined;
		savedReasons = saved ? [...selectedReasons] : [];
	}

	function reasonKey(reasons: string[]) {
		return [...reasons].sort().join('|');
	}
</script>

<form id="happiness-entry" class="space-y-6" onsubmit={saveEntry}>
	{#if errorMessage}
		<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
	{/if}
	<Field>
		<FieldLabel>Happiness level</FieldLabel>
		<div class="grid grid-cols-5 gap-2">
			{#each happinessRatings as value (value)}
				{@const selected = rating === value}
				<Button
					variant="ghost"
					class="h-12 px-0 text-base tabular-nums {selected ? 'text-white' : ''}"
					style={selected
						? `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
						: `background: color-mix(in srgb, ${colors.primary} 12%, transparent); color: ${colors.primary}`}
					aria-label={`${value}: ${happinessLabel(value)}`}
					aria-pressed={selected}
					onclick={() => chooseRating(value)}
				>
					{value}
				</Button>
			{/each}
		</div>
		<FieldDescription class="text-center">{happinessLabel(rating)}</FieldDescription>
	</Field>
	<Field>
		<FieldLabel>What influenced this?</FieldLabel>
		<FieldDescription>Choose one or more reasons that fit this happiness level.</FieldDescription>
		<div class="grid gap-3 pt-1 sm:grid-cols-2">
			{#each reasonOptions as option (option.value)}
				<div class="flex items-center gap-3">
					<Checkbox
						id={`happiness-reason-${option.value}`}
						name="reasons"
						value={option.value}
						class="border-0 bg-(--text)/8 data-[state=checked]:border-0"
						checked={selectedReasons.includes(option.value)}
						onCheckedChange={(checked) => updateReason(option.value, checked)}
					/>
					<label class="cursor-pointer text-sm" for={`happiness-reason-${option.value}`}>
						{option.label}
					</label>
				</div>
			{/each}
		</div>
	</Field>
</form>

<BottomActionBar contentClass="max-w-3xl" mobileOnly={false}>
	<Button
		form="happiness-entry"
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
