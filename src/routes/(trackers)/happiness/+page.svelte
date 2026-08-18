<script lang="ts">
	import { enhance } from '$app/forms';
	import { CalendarDays, Heart } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import {
		happinessLabel,
		happinessRatings,
		reasonOptionsForRating,
		type HappinessRating,
		type HappinessReason
	} from './happiness';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let loadedDate = $state(untrack(() => data.date));
	let loadedUpdatedAt = $state(untrack(() => String(data.entry?.updatedAt ?? '')));
	let rating = $state<HappinessRating>(untrack(() => data.entry?.rating ?? 3));
	let selectedReasons = $state<string[]>(untrack(() => data.entry?.reasons ?? []));
	const reasonOptions = $derived(reasonOptionsForRating(rating));

	$effect(() => {
		const updatedAt = String(data.entry?.updatedAt ?? '');
		if (loadedDate === data.date && loadedUpdatedAt === updatedAt) return;
		loadedDate = data.date;
		loadedUpdatedAt = updatedAt;
		rating = data.entry?.rating ?? 3;
		selectedReasons = data.entry?.reasons ?? [];
	});

	function chooseRating(value: HappinessRating) {
		rating = value;
		const validReasons = new Set<string>(
			reasonOptionsForRating(value).map((option) => option.value)
		);
		selectedReasons = selectedReasons.filter((reason) => validReasons.has(reason));
	}

	function updateReason(reason: HappinessReason, checked: boolean) {
		selectedReasons = checked
			? [...new Set([...selectedReasons, reason])]
			: selectedReasons.filter((value) => value !== reason);
	}

	function happinessHref(date: string) {
		return date === data.today ? '/happiness' : `/happiness?date=${date}`;
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
	<title>Happiness tracker · Self Improvement</title>
	<meta name="description" content="Track daily happiness and the reasons behind it." />
</svelte:head>

<main class="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	<div class="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Heart class="size-5" /> Happiness entry
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form method="POST" action="?/save" use:enhance class="space-y-6">
					<input type="hidden" name="localDate" value={data.date} />
					<input type="hidden" name="rating" value={rating} />
					{#if form?.form === 'happiness' && form.error}
						<Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>
					{/if}
					{#if form?.form === 'happiness' && form.message}
						<Alert><AlertDescription>{form.message}</AlertDescription></Alert>
					{/if}
					<Field>
						<FieldLabel>Happiness level</FieldLabel>
						<div class="grid grid-cols-5 gap-2">
							{#each happinessRatings as value (value)}
								<Button
									variant={rating === value ? 'default' : 'ghost'}
									class="h-12 px-0 text-base tabular-nums"
									aria-label={`${value}: ${happinessLabel(value)}`}
									aria-pressed={rating === value}
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
						<FieldDescription>
							Choose one or more reasons that fit this happiness level.
						</FieldDescription>
						<div class="grid gap-3 pt-1 sm:grid-cols-2">
							{#each reasonOptions as option (option.value)}
								<div class="flex items-center gap-3">
									<Checkbox
										id={`happiness-reason-${option.value}`}
										name="reasons"
										value={option.value}
										checked={selectedReasons.includes(option.value)}
										onCheckedChange={(checked) => updateReason(option.value, checked)}
									/>
									<label class="cursor-pointer text-sm" for={`happiness-reason-${option.value}`}
										>{option.label}</label
									>
								</div>
							{/each}
						</div>
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
								href={happinessHref(entry.localDate)}
								variant="ghost"
								class="h-auto w-full justify-between rounded-none bg-transparent px-0 py-3 hover:bg-transparent"
							>
								<span>{displayDate(entry.localDate)}</span>
								<Badge>{entry.rating}/5 · {happinessLabel(entry.rating)}</Badge>
							</Button>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-(--text)/56">No happiness entries yet.</p>
				{/if}
			</CardContent>
		</Card>
	</div>
</main>
