<script lang="ts">
import { Annoyed, ChevronLeft, Frown, Laugh, Meh, Smile } from '@lucide/svelte';
import { tick, untrack } from 'svelte';
import { invalidateAll } from '$app/navigation';
import { apiRequest } from '$lib/api';
import type { HappinessData } from '$lib/api-types';
import BottomActionBar from '$lib/components/bottomActionBar.svelte';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
import { Slider } from '$lib/components/ui/slider';
import { staggerChildren } from '$lib/motion/gsap';
import { getTrackerColors } from '$lib/trackers/registry';
import {
	type HappinessRating,
	type HappinessReason,
	happinessLabel,
	happinessRatings,
	reasonOptionsForRating
} from '../happiness';

let { data }: { data: HappinessData } = $props();
const colors = getTrackerColors('happiness');
const faceIcons = { 1: Frown, 2: Annoyed, 3: Meh, 4: Smile, 5: Laugh };
let errorMessage = $state('');
let saving = $state(false);
let step = $state<'feeling' | 'reasons'>('feeling');
let ratingSlider = $state<HTMLElement | null>(null);
let reasonsSection = $state<HTMLElement | null>(null);
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
const FaceIcon = $derived(faceIcons[rating]);
const reasonOptions = $derived(reasonOptionsForRating(rating));
const dirty = $derived(
	!hasSavedEntry || rating !== savedRating || reasonKey(selectedReasons) !== reasonKey(savedReasons)
);
const canSave = $derived(dirty && selectedReasons.length > 0);

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
	const dateChanged = loadedDate !== nextData.date;
	loadedDate = nextData.date;
	loadedUpdatedAt = updatedAt;
	loadedDefaultRating = defaultRating;
	rating = nextData.entry?.rating ?? defaultRating;
	selectedReasons = nextData.entry?.reasons ?? [];
	markSaved(Boolean(nextData.entry));
	if (dateChanged) resetStep();
}

function resetStep() {
	step = 'feeling';
	errorMessage = '';
}

function chooseRating(value: number) {
	const nextRating = value as HappinessRating;
	rating = nextRating;
	const validReasons = new Set<string>(
		reasonOptionsForRating(nextRating).map((option) => option.value)
	);
	selectedReasons = selectedReasons.filter((reason) => validReasons.has(reason));
}

function updateReason(reason: HappinessReason) {
	selectedReasons = selectedReasons.includes(reason)
		? selectedReasons.filter((value) => value !== reason)
		: [...selectedReasons, reason];
}

async function continueToReasons() {
	errorMessage = '';
	step = 'reasons';
	await tick();
	reasonsSection?.focus();
}

async function editFeeling() {
	step = 'feeling';
	await tick();
	ratingSlider?.querySelector<HTMLElement>('[role="slider"]')?.focus();
}

async function saveEntry(event: SubmitEvent) {
	event.preventDefault();
	if (!canSave || saving) return;
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
	{#if step === 'feeling'}
		<Field class="items-center gap-4 text-center">
			<div class="h-24" use:staggerChildren={{ delay: 0, y: 6 }}>
				{#key rating}<FaceIcon class="size-24" style={`color: ${colors.secondary}`} aria-hidden="true" />{/key}
			</div>
			<FieldLabel id="happiness-rating-label">How are you feeling?</FieldLabel>
			<FieldDescription id="happiness-rating-description" aria-live="polite">
				{rating} of 5 · {happinessLabel(rating)}
			</FieldDescription>
			<div class="happiness-slider w-full" style={`--happiness-slider-color: ${colors.secondary}`}>
				<Slider
					bind:ref={ratingSlider}
					type="single"
					bind:value={rating}
					min={1}
					max={5}
					step={1}
					aria-labelledby="happiness-rating-label"
					aria-describedby="happiness-rating-description"
					aria-valuetext={happinessLabel(rating)}
					onValueChange={chooseRating}
				/>
			</div>
			<div class="flex w-full justify-between px-6 text-sm tabular-nums text-(--text)/40" aria-hidden="true">
				{#each happinessRatings as value (value)}<span class="flex w-0 justify-center">{value}</span>{/each}
			</div>
		</Field>
	{:else}
		<section
			bind:this={reasonsSection}
			class="space-y-5 outline-none"
			aria-labelledby="happiness-reasons-title"
			tabindex="-1"
		>
			<div class="space-y-3">
				<Button
					variant="ghost"
					size="sm"
					type="button"
					onclick={editFeeling}
					aria-label="Back to feeling"
				>
					<ChevronLeft class="size-4" aria-hidden="true" />
					Back
				</Button>
				<div class="space-y-1">
					<h2
						id="happiness-reasons-title"
						class="text-lg font-medium tracking-[-0.39px]"
						style={`color: ${colors.primary}`}
					>
						What's the reason?
					</h2>
					<FieldDescription>Choose one or more.</FieldDescription>
				</div>
			</div>
			<div
				class="flex flex-wrap gap-2"
				role="group"
				aria-label="Happiness reasons"
				use:staggerChildren={{ delay: 0.04, y: 8 }}
			>
				{#each reasonOptions as option (option.value)}
					{@const selected = selectedReasons.includes(option.value)}
					<Button
						variant="ghost"
						style={selected
							? `background: color-mix(in srgb, ${colors.secondary} 18%, transparent); color: ${colors.primary}`
							: undefined}
						aria-pressed={selected}
						onclick={() => updateReason(option.value)}
					>
						{option.label}
					</Button>
				{/each}
			</div>
		</section>
	{/if}
</form>

<BottomActionBar contentClass="max-w-3xl" mobileOnly={false}>
	{#if step === 'feeling'}
		<Button type="button" size="lg" class="w-full text-black/80" style={`background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`} onclick={continueToReasons}>
			Continue
		</Button>
	{:else}
		<Button
			form="happiness-entry"
			type="submit"
			size="lg"
			variant={canSave ? 'default' : 'ghost'}
			class="w-full {canSave ? 'text-black/80' : ''}"
			style={canSave
				? `background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
				: undefined}
			disabled={!canSave || saving}
		>
			{saving ? 'Saving…' : dirty ? 'Save entry' : 'Saved'}
		</Button>
	{/if}
</BottomActionBar>

<style>
	.happiness-slider :global([data-slot='slider']) {
		min-height: 3.5rem;
	}

	.happiness-slider :global([data-slot='slider-track']) {
		height: 1.25rem;
	}

	.happiness-slider :global([data-slot='slider-thumb']) {
		height: 3rem;
		width: 3rem;
	}

	.happiness-slider :global([data-slot='slider-range']) {
		background: var(--happiness-slider-color);
	}
</style>
