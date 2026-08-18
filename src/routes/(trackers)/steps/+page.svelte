<script lang="ts">
	import WebhookPhoneSetup from '$lib/components/webhook-phone-setup.svelte';
	import { Progress } from '$lib/components/ui/progress';
	import { DEFAULT_STEP_GOAL, STEP_TOKEN_HEADER } from './steps';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const dailyGoal = $derived(data.connection?.dailyGoal ?? DEFAULT_STEP_GOAL);
	const progress = $derived(Math.min(100, Math.round((data.steps / dailyGoal) * 100)));

	function dayLabel(dateKey: string) {
		if (dateKey === data.today) return 'Today';
		return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
			new Date(`${dateKey}T12:00:00Z`)
		);
	}
</script>

<svelte:head>
	<title>Steps · Self Improvement</title>
	<meta name="description" content="Track daily steps from Android Health Connect." />
</svelte:head>

<main class="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	{#if data.isSynced}
		<section class="flex items-center justify-center py-2">
			<div class="flex flex-col items-center py-4 sm:py-6">
				<div
					class="relative flex size-56 items-center justify-center sm:size-64"
					role="progressbar"
					aria-label={`${data.steps} of ${dailyGoal} steps`}
					aria-valuemin="0"
					aria-valuemax={dailyGoal}
					aria-valuenow={data.steps}
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
						<strong class="block text-5xl font-medium tracking-[-0.07em] tabular-nums sm:text-6xl">
							{data.steps.toLocaleString()}
						</strong>
						<span class="mt-2 block text-sm text-(--text)/48 tabular-nums">
							/ {dailyGoal.toLocaleString()} steps
						</span>
					</div>
				</div>
			</div>
		</section>

		<section class="mx-auto max-w-3xl space-y-5" aria-labelledby="step-history-title">
			<h1 id="step-history-title" class="text-xl font-medium">Last 7 days</h1>
			<div class="space-y-4">
				{#each data.days as day (day.date)}
					<div class="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
						<span class="text-sm font-medium">{dayLabel(day.date)}</span>
						<Progress value={day.count} max={dailyGoal} />
						<span class="w-14 text-right text-sm text-(--text)/64 tabular-nums">
							{day.count.toLocaleString()}
						</span>
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<WebhookPhoneSetup
			connection={data.connection}
			{form}
			bridgeDescription="Use the free HC Webhook FOSS build as the bridge."
			webhookUrl={data.webhookUrl}
			tokenHeaderName={STEP_TOKEN_HEADER}
			tokenStorageKey="pending-step-token"
			download={{
				href: 'https://github.com/mcnaveen/health-connect-webhook/releases/latest',
				label: 'free FOSS APK',
				trailingText: 'and grant it Health Connect step access.'
			}}
			instructions={[
				[
					{ type: 'text', value: 'Enable ' },
					{ type: 'emphasis', value: 'Steps' },
					{ type: 'text', value: '. Other enabled health data is ignored by this endpoint.' }
				],
				[
					{ type: 'text', value: 'Set the Steps resolution to ' },
					{ type: 'emphasis', value: 'Daily' },
					{ type: 'text', value: '.' }
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
					{ type: 'text', value: ' and refresh this page.' }
				]
			]}
		/>
	{/if}
</main>
