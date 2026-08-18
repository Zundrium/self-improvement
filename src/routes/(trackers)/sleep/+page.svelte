<script lang="ts">
	import { enhance } from '$app/forms';
	import { Moon, Settings } from '@lucide/svelte';
	import WebhookPhoneSetup from '$lib/components/webhook-phone-setup.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Progress } from '$lib/components/ui/progress';
	import { DEFAULT_SLEEP_GOAL_MINUTES, formatSleepMinutes, SLEEP_TOKEN_HEADER } from './sleep';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const dailyGoalMinutes = $derived(
		data.connection?.dailyGoalMinutes ?? DEFAULT_SLEEP_GOAL_MINUTES
	);
	const selectedMinutes = $derived(Math.round(data.durationSeconds / 60));
	const progress = $derived(Math.min(100, Math.round((selectedMinutes / dailyGoalMinutes) * 100)));

	function dayLabel(dateKey: string) {
		if (dateKey === data.today) return 'Today';
		return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
			new Date(`${dateKey}T12:00:00Z`)
		);
	}
</script>

<svelte:head>
	<title>Sleep · Self Improvement</title>
	<meta name="description" content="Track daily sleep from Android Health Connect." />
</svelte:head>

<main class="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	{#if data.isSynced}
		<section class="flex items-center justify-center py-2" aria-labelledby="daily-sleep-title">
			<div class="flex flex-col items-center py-4 sm:py-6">
				<h1 id="daily-sleep-title" class="mb-3 text-sm font-medium text-(--text)/56">
					Sleep ending {data.date === data.today ? 'today' : data.date}
				</h1>
				<div
					class="relative flex size-56 items-center justify-center sm:size-64"
					role="progressbar"
					aria-label={`${selectedMinutes} of ${dailyGoalMinutes} sleep minutes`}
					aria-valuemin="0"
					aria-valuemax={dailyGoalMinutes}
					aria-valuenow={selectedMinutes}
				>
					<svg
						class="absolute inset-0 size-full -rotate-90"
						viewBox="0 0 120 120"
						aria-hidden="true"
					>
						<circle
							cx="60"
							cy="60"
							r="52"
							pathLength="100"
							fill="none"
							stroke="currentColor"
							stroke-width="8"
							class="text-(--text)/8"
						/>
						<circle
							cx="60"
							cy="60"
							r="52"
							pathLength="100"
							fill="none"
							stroke="currentColor"
							stroke-width="8"
							stroke-linecap="round"
							class="text-(--text) transition-all duration-500"
							style={`stroke-dasharray: ${progress} 100`}
						/>
					</svg>
					<div class="relative text-center">
						<Moon class="mx-auto mb-3 size-6 text-(--text)/56" />
						<strong class="block text-4xl font-medium tracking-[-0.06em] tabular-nums sm:text-5xl">
							{formatSleepMinutes(selectedMinutes)}
						</strong>
						<span class="mt-2 block text-sm text-(--text)/48 tabular-nums">
							/ {formatSleepMinutes(dailyGoalMinutes)} goal
						</span>
					</div>
				</div>
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
						<div class="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
							<span class="text-sm font-medium">{dayLabel(day.date)}</span>
							<Progress value={Math.round(day.durationSeconds / 60)} max={dailyGoalMinutes} />
							<span class="w-16 text-right text-sm text-(--text)/64 tabular-nums">
								{formatSleepMinutes(Math.round(day.durationSeconds / 60))}
							</span>
						</div>
					{/each}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2"
						><Settings class="size-4" /> Daily goal</CardTitle
					>
				</CardHeader>
				<CardContent>
					<form method="POST" action="?/goal" use:enhance class="space-y-4">
						{#if form?.kind === 'goal' && form.error}
							<Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>
						{:else if form?.kind === 'goal' && form.message}
							<Alert><AlertDescription>{form.message}</AlertDescription></Alert>
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
								value={dailyGoalMinutes}
								required
							/>
							<FieldDescription>{formatSleepMinutes(dailyGoalMinutes)} per day</FieldDescription>
						</Field>
						<Button type="submit">Save goal</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	{:else}
		<WebhookPhoneSetup
			connection={data.connection}
			{form}
			bridgeDescription="Use the free HC Webhook FOSS build as the bridge."
			webhookUrl={data.webhookUrl}
			tokenHeaderName={SLEEP_TOKEN_HEADER}
			tokenStorageKey="pending-sleep-token"
			download={{
				href: 'https://github.com/mcnaveen/health-connect-webhook/releases/latest',
				label: 'free FOSS APK',
				trailingText: 'and grant it Health Connect sleep access.'
			}}
			instructions={[
				[
					{ type: 'text', value: 'Enable ' },
					{ type: 'emphasis', value: 'Sleep' },
					{ type: 'text', value: '. Other enabled health data is ignored by this endpoint.' }
				],
				[
					{ type: 'text', value: 'Use the ' },
					{ type: 'emphasis', value: 'Full' },
					{
						type: 'text',
						value: ' sleep resolution to exclude awake stages when available.'
					}
				],
				[
					{
						type: 'text',
						value: 'Add the webhook URL and custom header shown above, then choose a sync schedule.'
					}
				],
				[
					{ type: 'text', value: 'Tap ' },
					{ type: 'emphasis', value: 'Sync now' },
					{ type: 'text', value: ' after sleep data is available, then refresh this page.' }
				]
			]}
		/>
	{/if}
</main>
