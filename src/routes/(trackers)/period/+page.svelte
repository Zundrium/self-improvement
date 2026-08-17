<script lang="ts">
	import { enhance } from '$app/forms';
	import { CalendarDays, Droplet } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import DateSelector from '$lib/components/date-selector.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { flowLabel, flowOptions, type MenstruationFlow } from './period';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let loadedDate = $state(untrack(() => data.date));
	let loadedUpdatedAt = $state(untrack(() => String(data.entry?.updatedAt ?? '')));
	let flow = $state<MenstruationFlow>(untrack(() => data.entry?.flow ?? 'medium'));
	let notes = $state(untrack(() => data.entry?.notes ?? ''));

	$effect(() => {
		const updatedAt = String(data.entry?.updatedAt ?? '');
		if (loadedDate === data.date && loadedUpdatedAt === updatedAt) return;
		loadedDate = data.date;
		loadedUpdatedAt = updatedAt;
		flow = data.entry?.flow ?? 'medium';
		notes = data.entry?.notes ?? '';
	});

	function periodHref(date: string) {
		return date === data.today ? '/period' : `/period?date=${date}`;
	}

	function displayDate(date: string) {
		return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}
</script>

<svelte:head>
	<title>Period tracker · Self Improvement</title>
	<meta name="description" content="Track menstruation flow, notes, and cycle history." />
</svelte:head>

<main class="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 pb-28 sm:px-6 sm:py-10">
	<DateSelector
		date={data.date}
		today={data.today}
		markedDates={data.markedDates}
		hrefForDate={periodHref}
	/>

	<div class="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Droplet class="size-5" /> Period entry
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form method="POST" action="?/save" use:enhance class="space-y-5">
					<input type="hidden" name="localDate" value={data.date} />
					{#if form?.form === 'period' && form.error}
						<Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>
					{/if}
					{#if form?.form === 'period' && form.message}
						<Alert><AlertDescription>{form.message}</AlertDescription></Alert>
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
					<div class="flex flex-wrap gap-2">
						<Button type="submit">{data.entry ? 'Update entry' : 'Save entry'}</Button>
						{#if data.entry}
							<Button type="submit" formaction="?/delete" variant="destructive">Remove entry</Button
							>
						{/if}
					</div>
				</form>
			</CardContent>
		</Card>

		<div class="space-y-4">
			<Card>
				<CardHeader><CardTitle>Cycle overview</CardTitle></CardHeader>
				<CardContent>
					{#if data.cycle}
						<div class="divide-y divide-(--text)/8 text-sm">
							<div class="flex items-center justify-between gap-4 py-3 first:pt-0">
								<span class="text-(--text)/56">Last period started</span>
								<strong>{displayDate(data.cycle.lastPeriodStarted)}</strong>
							</div>
							<div class="flex items-center justify-between gap-4 py-3">
								<span class="text-(--text)/56">Estimated next period</span>
								<strong>{displayDate(data.cycle.estimatedNextPeriod)}</strong>
							</div>
							<div class="flex items-center justify-between gap-4 py-3 last:pb-0">
								<span class="text-(--text)/56">
									{data.cycle.averageFromHistory ? 'Average cycle' : 'Starting estimate'}
								</span>
								<strong>{data.cycle.averageCycleDays} days</strong>
							</div>
						</div>
						<p class="text-xs leading-5 text-(--text)/40">
							Estimates are based only on saved entries and are not medical advice.
						</p>
					{:else}
						<p class="text-sm leading-6 text-(--text)/56">
							Save your first day to begin building a cycle history.
						</p>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<CalendarDays class="size-5" /> Recent entries
					</CardTitle>
				</CardHeader>
				<CardContent>
					{#if data.recentEntries.length}
						<div class="divide-y divide-(--text)/8">
							{#each data.recentEntries as entry (entry.localDate)}
								<Button
									href={periodHref(entry.localDate)}
									variant="ghost"
									class="h-auto w-full justify-between rounded-none bg-transparent px-0 py-3 hover:bg-transparent"
								>
									<span>{displayDate(entry.localDate)}</span>
									<Badge>{flowLabel(entry.flow)}</Badge>
								</Button>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-(--text)/56">No period entries yet.</p>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</main>
