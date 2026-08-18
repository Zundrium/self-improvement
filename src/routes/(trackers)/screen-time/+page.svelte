<script lang="ts">
	import { Clock, Smartphone } from '@lucide/svelte';
	import WebhookPhoneSetup from '$lib/components/webhook-phone-setup.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { formatScreenTime, SCREEN_TIME_TOKEN_HEADER } from './screen-time';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const appProgressMax = $derived(Math.max(1, data.usage.totalMinutes));

	function dayLabel(dateKey: string) {
		if (dateKey === data.today) return 'Today';
		return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
			new Date(`${dateKey}T12:00:00Z`)
		);
	}

	function selectedDateLabel() {
		if (data.date === data.today) return 'Today';
		return new Intl.DateTimeFormat('en', {
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${data.date}T12:00:00Z`));
	}
</script>

<svelte:head>
	<title>Screen Time · Self Improvement</title>
	<meta name="description" content="Track daily Android screen time and per-app usage." />
</svelte:head>

<main class="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
	{#if data.isSynced}
		<section class="grid gap-4 sm:grid-cols-2" aria-label="Screen-time summary">
			<Card>
				<CardHeader>
					<CardDescription>{selectedDateLabel()}</CardDescription>
					<CardTitle class="flex items-center gap-2">
						<Smartphone class="size-5" /> Screen time
					</CardTitle>
				</CardHeader>
				<CardContent>
					<strong class="text-4xl font-medium tracking-[-0.05em] tabular-nums sm:text-5xl">
						{formatScreenTime(data.usage.totalMinutes)}
					</strong>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardDescription>Across the last seven calendar days</CardDescription>
					<CardTitle class="flex items-center gap-2">
						<Clock class="size-5" /> Daily average
					</CardTitle>
				</CardHeader>
				<CardContent>
					<strong class="text-4xl font-medium tracking-[-0.05em] tabular-nums sm:text-5xl">
						{formatScreenTime(data.averageMinutes)}
					</strong>
				</CardContent>
			</Card>
		</section>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Last 7 days</CardTitle>
					<CardDescription>Daily screen-time totals</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#each data.days as day (day.date)}
						<div class="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
							<span class="text-sm font-medium">{dayLabel(day.date)}</span>
							<Progress value={day.totalMinutes} max={data.historyMaxMinutes} />
							<span class="w-20 text-right text-sm text-(--text)/64 tabular-nums">
								{formatScreenTime(day.totalMinutes)}
							</span>
						</div>
					{/each}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Top apps</CardTitle>
					<CardDescription>{selectedDateLabel()} usage breakdown</CardDescription>
				</CardHeader>
				<CardContent>
					{#if data.usage.apps.length}
						<div class="space-y-5">
							{#each data.usage.apps as app (app.package)}
								<div class="space-y-2">
									<div class="flex items-start justify-between gap-4 text-sm">
										<div class="min-w-0">
											<p class="truncate font-medium">{app.name}</p>
											<p class="truncate text-xs text-(--text)/40">{app.package}</p>
										</div>
										<span class="shrink-0 text-(--text)/64 tabular-nums">
											{formatScreenTime(app.minutes)}
										</span>
									</div>
									<Progress value={app.minutes} max={appProgressMax} />
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm leading-6 text-(--text)/56">
							No per-app usage was recorded for this day.
						</p>
					{/if}
				</CardContent>
			</Card>
		</div>
	{:else}
		<WebhookPhoneSetup
			connection={data.connection}
			{form}
			bridgeDescription="Sync Android usage data with Life Dashboard Companion."
			webhookUrl={data.webhookUrl}
			tokenHeaderName={SCREEN_TIME_TOKEN_HEADER}
			tokenStorageKey="pending-screen-time-token"
			download={{
				href: 'https://github.com/owen282000/life-dashboard-companion-app/releases/latest',
				label: 'latest Life Dashboard Companion release',
				trailingText: 'on your Android phone.'
			}}
			instructions={[
				[
					{ type: 'text', value: 'Open ' },
					{ type: 'emphasis', value: 'Screen Time' },
					{
						type: 'text',
						value:
							' in the companion app, grant Usage Access, and allow the app in Android settings.'
					}
				],
				[
					{
						type: 'text',
						value: 'Add the webhook URL under the Screen Time webhook settings.'
					}
				],
				[
					{ type: 'text', value: 'Add a custom header named ' },
					{ type: 'emphasis', value: SCREEN_TIME_TOKEN_HEADER },
					{ type: 'text', value: ' with the one-time token shown above.' }
				],
				[
					{
						type: 'text',
						value:
							'Choose your day boundary and sync schedule, then preview the screen-time payload.'
					}
				],
				[
					{ type: 'text', value: 'Tap ' },
					{ type: 'emphasis', value: 'Sync Now' },
					{ type: 'text', value: ' and refresh this page after a daily record is sent.' }
				]
			]}
		/>
	{/if}
</main>
