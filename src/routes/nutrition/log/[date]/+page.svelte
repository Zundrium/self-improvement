<script lang="ts">
import { Form } from '$lib/components/ui/form';
import { invalidateAll } from '$app/navigation';
import { MoonStar, Plus } from '@lucide/svelte';
import { toast } from '$lib/components/ui/toast';
import { localOperation } from '$lib/api';
import TrackerPage from '$lib/components/tracker/TrackerPage.svelte';
import { BottomActionButton, BottomActionGroup } from '$lib/components/ui/bottom-action-bar';
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '$lib/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { Spinner } from '$lib/components/ui/spinner';
import { fullDateLabel, shortDateLabel } from '$lib/dateFormatting';
import FastingStatusSection from './components/fastingStatusSection.svelte';
import FoodLogSection from './components/foodLogSection.svelte';
import NutritionSummarySection from './components/nutritionSummarySection.svelte';
import type { PageProps } from './$types';

const MAX_FASTING_DAYS = 30;
let { data }: PageProps = $props();
let markOpen = $state(false);
let days = $state(1);
let busy = $state(false);
let requestError = $state('');
const maxDays = $derived(daysThroughToday(data.date, data.today));
const lastFastingDate = $derived(addDays(data.date, Math.max(0, Number(days) - 1)));

function openMarkDialog() {
	if (data.entries.length) {
		toast.error('Remove logged meals before marking a fast.');
		return;
	}
	days = 1;
	requestError = '';
	markOpen = true;
}

async function markFasting(event: SubmitEvent) {
	event.preventDefault();
	busy = true;
	requestError = '';
	try {
		await localOperation('markNutritionFasting', { date: data.date, days: Number(days) });
		markOpen = false;
		toast.success(Number(days) === 1 ? 'Fasting day marked' : `${days} fasting days marked`);
		await invalidateAll();
	} catch (cause) {
		requestError = cause instanceof Error ? cause.message : 'Could not mark these fasting days.';
	} finally {
		busy = false;
	}
}

async function cancelFasting() {
	busy = true;
	try {
		await localOperation('cancelNutritionFasting', { date: data.date });
		toast.success('Fasting day cancelled');
		await invalidateAll();
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not cancel this fasting day.');
	} finally {
		busy = false;
	}
}

function daysThroughToday(date: string, today: string) {
	const milliseconds = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`);
	return Math.min(MAX_FASTING_DAYS, Math.floor(milliseconds / 86_400_000) + 1);
}

function addDays(date: string, offset: number) {
	return new Date(Date.parse(`${date}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}
</script>

<svelte:head><title>{fullDateLabel(data.date)} · Self Improvement</title></svelte:head>

<TrackerPage
	progress={{
		mode: 'line',
		days: data.progressDays,
		maxValue: data.calorieGoal,
		ariaLabel: 'Five-day calorie progress'
	}}
>
	{#if data.fasting}
		<FastingStatusSection />
	{:else}
		<NutritionSummarySection
			totals={data.totals}
			goal={data.calorieGoal}
			date={data.date}
			today={data.today}
			eatingWindow={data.eatingWindow}
		/>
		<FoodLogSection entries={data.entries} />
	{/if}
</TrackerPage>

<PageActionBar contentClass="max-w-5xl" mobileOnly={false}>
	<BottomActionGroup>
		{#if data.fasting}
			<AlertDialog>
				<AlertDialogTrigger>
					{#snippet child({ props })}
						<BottomActionButton tone="destructive" disabled={busy} {...props}>
							{#if busy}<Spinner class="mr-2 size-4" />{:else}<MoonStar class="mr-2 size-5" />{/if}
							Cancel fasting day
						</BottomActionButton>
					{/snippet}
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cancel this fasting day?</AlertDialogTitle>
						<AlertDialogDescription>
							You will be able to add meals to {fullDateLabel(data.date)} again. Other fasting days will
							stay marked.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel size="medium">Keep fasting</AlertDialogCancel>
						<AlertDialogAction
							size="medium"
							profile="plain"
							tone="destructive"
							onclick={cancelFasting}
						>
							Cancel fasting day
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		{:else}
			<BottomActionButton expand={false} onclick={openMarkDialog}>
				<MoonStar class="mr-2 size-4" /> Fast
			</BottomActionButton>
			<BottomActionButton tone="primary" href="/nutrition/track?date={data.date}">
				<Plus class="mr-2 size-5" /> Add a meal
			</BottomActionButton>
		{/if}
	</BottomActionGroup>
</PageActionBar>

<Dialog bind:open={markOpen}>
	<DialogContent>
		<Form class="space-y-5" onsubmit={markFasting}>
			<DialogHeader>
				<DialogTitle>Mark a full-day fast</DialogTitle>
				<DialogDescription>
					Starting {fullDateLabel(data.date)}, meals will be paused for each selected day.
				</DialogDescription>
			</DialogHeader>
			<Field>
				<FieldLabel for="fasting-days">Consecutive days</FieldLabel>
				<Input id="fasting-days" type="number" min={1} max={maxDays} bind:value={days} required />
				<FieldDescription>
					{#if Number(days) > 1}
						{shortDateLabel(data.date)}–{shortDateLabel(lastFastingDate)}
					{:else}
						{shortDateLabel(data.date)} only
					{/if}
				</FieldDescription>
			</Field>
			{#if requestError}<p class="text-sm text-(--status-danger-text)">{requestError}</p>{/if}
			<DialogFooter>
				<Button size="medium" type="button" profile="plain" onclick={() => (markOpen = false)}>Cancel</Button>
				<Button profile="highlighted" size="medium"
					type="submit"
					disabled={busy ||
						Number(days) < 1 ||
						Number(days) > maxDays ||
						!Number.isInteger(Number(days))}
				>
					{#if busy}<Spinner class="mr-2 size-4" />{/if} Mark fasting
				</Button>
			</DialogFooter>
		</Form>
	</DialogContent>
</Dialog>
