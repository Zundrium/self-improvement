<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { CalendarDays, Droplet } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Textarea } from '$lib/components/ui/textarea';
	import { flowLabel, flowOptions, type MenstruationFlow } from './period';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let formMessage = $state('');
	let formFailed = $state(false);
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

	async function saveEntry(event: SubmitEvent) {
		event.preventDefault();
		await mutateEntry('PUT', { localDate: data.date, flow, notes });
	}

	async function deleteEntry() {
		await mutateEntry('DELETE');
	}

	async function mutateEntry(method: 'PUT' | 'DELETE', body?: Record<string, unknown>) {
		try {
			const query = method === 'DELETE' ? `?date=${data.date}` : '';
			await apiRequest(`/api/app/period${query}`, {
				method,
				body: body ? JSON.stringify(body) : undefined
			});
			formFailed = false;
			formMessage = method === 'DELETE' ? 'Period entry removed.' : 'Period entry saved.';
			await invalidateAll();
		} catch (cause) {
			formFailed = true;
			formMessage = cause instanceof Error ? cause.message : 'Could not save your entry.';
		}
	}

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

<main class="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	<div class="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Droplet class="size-5" /> Period entry
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form class="space-y-5" onsubmit={saveEntry}>
					{#if formMessage}
						<Alert variant={formFailed ? 'destructive' : 'default'}>
							<AlertDescription>{formMessage}</AlertDescription>
						</Alert>
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
							<Button type="button" variant="destructive" onclick={deleteEntry}>Remove entry</Button
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
