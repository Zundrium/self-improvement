<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Moon, Settings } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import CircularProgress from '$lib/components/circularProgress.svelte';
	import MetricProgressRow from '$lib/components/metricProgressRow.svelte';
	import { shortDayLabel } from '$lib/dateFormatting';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { DEFAULT_SLEEP_GOAL_MINUTES, formatSleepMinutes } from './sleep';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const dailyGoalMinutes = $derived(
		data.connection?.dailyGoalMinutes ?? DEFAULT_SLEEP_GOAL_MINUTES
	);
	const selectedMinutes = $derived(Math.round(data.durationSeconds / 60));
	let goalInput = $state(untrack(() => dailyGoalMinutes));
	let goalMessage = $state('');
	let goalFailed = $state(false);

	async function saveGoal(event: SubmitEvent) {
		event.preventDefault();
		try {
			await apiRequest('/api/app/sleep', {
				method: 'PATCH',
				body: JSON.stringify({ dailyGoalMinutes: goalInput })
			});
			goalFailed = false;
			goalMessage = 'Daily sleep goal updated.';
			await invalidateAll();
		} catch (cause) {
			goalFailed = true;
			goalMessage = cause instanceof Error ? cause.message : 'Could not update the goal.';
		}
	}
</script>

<svelte:head>
	<title>Sleep · Self Improvement</title>
	<meta name="description" content="Track daily sleep from Android Health Connect." />
</svelte:head>

<main class="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	<section class="flex items-center justify-center py-2" aria-labelledby="daily-sleep-title">
		<div class="flex flex-col items-center py-4 sm:py-6">
			<h1 id="daily-sleep-title" class="mb-3 text-sm font-medium text-(--text)/56">
				Sleep ending {data.date === data.today ? 'today' : data.date}
			</h1>
			<CircularProgress
				value={selectedMinutes}
				max={dailyGoalMinutes}
				label={`${selectedMinutes} of ${dailyGoalMinutes} sleep minutes`}
			>
				<Moon class="mx-auto mb-3 size-6 text-(--text)/56" />
				<strong class="block text-4xl font-medium tracking-[-0.06em] tabular-nums sm:text-5xl">
					{formatSleepMinutes(selectedMinutes)}
				</strong>
				<span class="mt-2 block text-sm text-(--text)/48 tabular-nums">
					/ {formatSleepMinutes(dailyGoalMinutes)} goal
				</span>
			</CircularProgress>
		</div>
	</section>

	<div class="mx-auto grid max-w-3xl gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between gap-4">
					<CardTitle>Last 7 days</CardTitle>
					<div class="text-right">
						<p class="text-xs text-(--text)/48">Average</p>
						<p class="text-sm font-medium tabular-nums">
							{formatSleepMinutes(data.averageMinutes)}
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent class="space-y-4">
				{#each data.days as day (day.date)}
					<MetricProgressRow
						label={shortDayLabel(day.date, data.today)}
						value={Math.round(day.durationSeconds / 60)}
						max={dailyGoalMinutes}
						displayValue={formatSleepMinutes(Math.round(day.durationSeconds / 60))}
					/>
				{/each}
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2"><Settings class="size-4" /> Daily goal</CardTitle
				>
			</CardHeader>
			<CardContent>
				<form class="space-y-4" onsubmit={saveGoal}>
					{#if goalMessage}
						<Alert variant={goalFailed ? 'destructive' : 'default'}>
							<AlertDescription>{goalMessage}</AlertDescription>
						</Alert>
					{/if}
					<Field>
						<FieldLabel for="dailyGoalMinutes">Minutes</FieldLabel>
						<Input
							id="dailyGoalMinutes"
							name="dailyGoalMinutes"
							type="number"
							min="60"
							max="1440"
							step="15"
							bind:value={goalInput}
							required
						/>
						<FieldDescription>{formatSleepMinutes(dailyGoalMinutes)} per day</FieldDescription>
					</Field>
					<Button type="submit">Save goal</Button>
				</form>
			</CardContent>
		</Card>
	</div>
</main>
