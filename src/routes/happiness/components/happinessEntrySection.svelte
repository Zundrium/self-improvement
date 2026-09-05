<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import TrackerSection from '$lib/components/tracker/TrackerSection.svelte';
import { Form } from '$lib/components/ui/form';
import { Annoyed, ChevronLeft, Frown, Laugh, Meh, Smile } from '@lucide/svelte';
import { onDestroy, tick, untrack } from 'svelte';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { apiRequest } from '$lib/api';
import type { HappinessData } from '$lib/api-types';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { BottomActionButton, BottomActionGroup } from '$lib/components/ui/bottom-action-bar';
import { Button } from '$lib/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
import { Slider } from '$lib/components/ui/slider';
import { staggerChildren } from '$lib/motion/gsap';
import { getTrackerColors, trackerGradient } from '$lib/trackers/registry';
import {
	type HappinessRating,
	type HappinessReason,
	happinessLabel,
	happinessRatings,
	reasonOptionsForRating
} from '../happiness';
import { DateBoundRequestLifetime } from '$lib/forms/date-bound-request';
import { submittedSnapshot } from '$lib/forms/draft';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

let { data }: { data: HappinessData } = $props();
const colors = getTrackerColors('happiness');
const faceIcons = { 1: Frown, 2: Annoyed, 3: Meh, 4: Smile, 5: Laugh };
const happinessGradient = trackerGradient(colors, 90);
const faceColors = {
	1: colors.primary,
	2: `color-mix(in srgb, ${colors.primary} 50%, ${colors.secondary})`,
	3: colors.secondary,
	4: `color-mix(in srgb, ${colors.secondary} 50%, ${colors.tertiary})`,
	5: colors.tertiary
} satisfies Record<HappinessRating, string>;
let errorMessage = $state('');
let saving = $state(false);
let step = $state<'feeling' | 'reasons'>('feeling');
let ratingSlider = $state<HTMLElement | null>(null);
let reasonsSection = $state<HTMLElement | null>(null);
let loadedDate = $state(untrack(() => data.date));
const entryRequests = new DateBoundRequestLifetime(untrack(() => data.date));
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
const faceColor = $derived(faceColors[rating]);
const reasonOptions = $derived(reasonOptionsForRating(rating));
const dirty = $derived(
	!hasSavedEntry || rating !== savedRating || reasonKey(selectedReasons) !== reasonKey(savedReasons)
);
const canSave = $derived(dirty && selectedReasons.length > 0);
guardUnsavedNavigation(() => dirty && !saving);

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
	if (dateChanged) {
		entryRequests.syncDate(nextData.date);
		saving = false;
		errorMessage = '';
	}
	if (!dateChanged && dirty) {
		hasSavedEntry = Boolean(nextData.entry);
		savedRating = nextData.entry?.rating;
		savedReasons = nextData.entry?.reasons ?? [];
		return;
	}
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
	const submitted = submittedSnapshot({ localDate: data.date, rating, reasons: selectedReasons });
	const request = entryRequests.begin(submitted.localDate);
	saving = true;
	errorMessage = '';
	try {
		await apiRequest('/api/app/happiness', {
			method: 'PUT',
			body: JSON.stringify(submitted)
		});
		if (entryRequests.isCurrent(request, data.date)) {
			hasSavedEntry = true;
			savedRating = submitted.rating;
			savedReasons = submitted.reasons;
		}
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() => {
			if (entryRequests.isCurrent(request, data.date))
				errorMessage = 'Saved, but could not refresh the page.';
		});
	} catch (cause) {
		if (entryRequests.isCurrent(request, data.date))
			errorMessage = cause instanceof Error ? cause.message : 'Could not save your entry.';
	} finally {
		if (entryRequests.isCurrent(request, data.date)) saving = false;
	}
}

onDestroy(() => entryRequests.dispose());

function markSaved(saved: boolean) {
	hasSavedEntry = saved;
	savedRating = saved ? rating : undefined;
	savedReasons = saved ? [...selectedReasons] : [];
}

function reasonKey(reasons: string[]) {
	return [...reasons].sort().join('|');
}
</script>

<TrackerSection ariaLabel="Daily happiness entry">
	<Form id="happiness-entry" onsubmit={saveEntry}>
	{#if errorMessage}
		<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
	{/if}
	{#if step === 'feeling'}
		<Field class="items-center gap-4 text-center">
			<div class="h-24" use:staggerChildren={{ delay: 0, y: 6 }}>
				{#key rating}<FaceIcon
						class="dynamic-color size-24"
						style={`--dynamic-color: ${faceColor}`}
						aria-hidden="true"
					/>{/key}
			</div>
			<FieldLabel id="happiness-rating-label">How are you feeling?</FieldLabel>
			<div
				class="happiness-slider w-full"
				style:--happiness-slider-gradient={happinessGradient}
			>
				<Slider
					bind:ref={ratingSlider}
					type="single"
					bind:value={rating}
					min={1}
					max={5}
					step={1}
					aria-labelledby="happiness-rating-label"
					aria-valuetext={happinessLabel(rating)}
					onValueChange={chooseRating}
				/>
			</div>
			<div class="flex w-full justify-between px-6 text-sm tabular-nums text-(--text-muted)" aria-hidden="true">
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
					profile="plain"
					size="small"
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
					<Button size="medium"
						profile={selected ? 'active' : 'plain'}
						aria-pressed={selected}
						onclick={() => updateReason(option.value)}
					>
						{option.label}
					</Button>
				{/each}
			</div>
		</section>
	{/if}
	</Form>
</TrackerSection>

<PageActionBar contentClass="max-w-3xl" mobileOnly={false}>
	<BottomActionGroup>
		{#if step === 'feeling'}
			<BottomActionButton type="button" tone="primary" onclick={continueToReasons}>
				Continue
			</BottomActionButton>
		{:else}
			<BottomActionButton
				form="happiness-entry"
				type="submit"
				tone={canSave ? 'primary' : 'neutral'}
				disabled={!canSave || saving}
			>
				{saving ? 'Saving…' : dirty ? 'Save entry' : 'Saved'}
			</BottomActionButton>
		{/if}
	</BottomActionGroup>
</PageActionBar>

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
	background: var(--happiness-slider-gradient);
}
</style>
