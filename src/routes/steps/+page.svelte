<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, Clipboard, Footprints, RefreshCw, Smartphone } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Progress } from '$lib/components/ui/progress';
	import { STEP_TOKEN_HEADER } from './steps';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let timeZone = $state('UTC');
	let copied = $state('');
	const todaySteps = $derived(data.days.at(-1)?.count ?? 0);
	const dailyGoal = $derived(data.connection?.dailyGoal ?? 10_000);
	const goalProgress = $derived(Math.min(100, Math.round((todaySteps / dailyGoal) * 100)));
	const generatedToken = $derived(
		form?.kind === 'connection' && 'token' in form && typeof form.token === 'string'
			? form.token
			: ''
	);

	onMount(() => {
		timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	});

	async function copyValue(label: string, value: string) {
		await navigator.clipboard.writeText(value);
		copied = label;
		setTimeout(() => (copied = ''), 1600);
	}

	function dayLabel(dateKey: string) {
		if (dateKey === data.today) return 'Today';
		return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(
			new Date(`${dateKey}T12:00:00Z`)
		);
	}

	function syncLabel(value: Date | null) {
		if (!value) return 'Waiting for first sync';
		return new Intl.DateTimeFormat('en', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: data.connection?.timeZone
		}).format(new Date(value));
	}
</script>

<svelte:head>
	<title>Steps · Self Improvement</title>
	<meta name="description" content="Track daily steps from Android Health Connect." />
</svelte:head>

<main class="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
	{#if data.hasStepData}
		<header class="space-y-3">
			<span class="flex size-12 items-center justify-center rounded-3xl bg-(--text) text-(--bg)">
				<Footprints class="size-6" />
			</span>
			<div>
				<h1 class="text-3xl font-semibold tracking-[-0.05em]">Daily steps</h1>
				<p class="mt-2 text-(--text)/56">Synced privately from Health Connect on your phone.</p>
			</div>
		</header>

		<section
			class="grid border-y border-(--text)/8 sm:grid-cols-[1.2fr_0.8fr] sm:divide-x sm:divide-(--text)/8"
			aria-label="Today's step summary"
		>
			<div class="space-y-4 py-6 sm:pr-6">
				<p class="text-sm text-(--text)/56">Today</p>
				<p class="text-4xl font-semibold tracking-[-0.05em] tabular-nums">
					{todaySteps.toLocaleString()}
				</p>
				<Progress value={todaySteps} max={dailyGoal} />
				<div class="flex items-center justify-between text-sm text-(--text)/56">
					<span>{goalProgress}% of goal</span>
					<span>{dailyGoal.toLocaleString()} steps</span>
				</div>
			</div>

			<div class="space-y-2 border-t border-(--text)/8 py-6 sm:border-0 sm:pl-6">
				<h2 class="font-medium">Connection</h2>
				<p class="text-sm font-medium">{syncLabel(data.connection?.lastReceivedAt ?? null)}</p>
				<p class="text-sm text-(--text)/56">
					{data.connection?.appVersion
						? `HC Webhook ${data.connection.appVersion}`
						: 'Health Connect data received.'}
				</p>
			</div>
		</section>

		<section class="space-y-5" aria-labelledby="step-history-title">
			<div>
				<h2 id="step-history-title" class="text-xl font-medium">Last 7 days</h2>
				<p class="mt-1 text-sm text-(--text)/56">
					Daily totals use the timezone saved with your webhook.
				</p>
			</div>
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
	{/if}

	<section
		class="space-y-6 {data.hasStepData ? 'border-t border-(--text)/8 pt-8' : ''}"
		aria-labelledby="webhook-setup-title"
	>
		<div class="flex items-center gap-3">
			<span class="flex size-10 items-center justify-center rounded-3xl bg-(--text)/8">
				<Smartphone class="size-5" />
			</span>
			<div>
				{#if data.hasStepData}
					<h2 id="webhook-setup-title" class="text-xl font-medium">Connect your phone</h2>
				{:else}
					<h1 id="webhook-setup-title" class="text-xl font-medium">Connect your phone</h1>
				{/if}
				<p class="text-sm text-(--text)/56">Use the free HC Webhook FOSS build as the bridge.</p>
			</div>
		</div>

		{#if form?.kind === 'connection' && form.error}
			<Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>
		{/if}

		{#if generatedToken}
			<Alert>
				<AlertDescription>
					Copy this token now. It is stored securely and cannot be shown again.
				</AlertDescription>
			</Alert>
			<div class="space-y-4">
				{@render Credential({
					label: 'Webhook URL',
					value: data.webhookUrl,
					copied: copied === 'url',
					oncopy: () => copyValue('url', data.webhookUrl)
				})}
				{@render Credential({
					label: 'Custom header name',
					value: STEP_TOKEN_HEADER,
					copied: copied === 'header',
					oncopy: () => copyValue('header', STEP_TOKEN_HEADER)
				})}
				{@render Credential({
					label: 'Custom header value',
					value: generatedToken,
					copied: copied === 'token',
					oncopy: () => copyValue('token', generatedToken)
				})}
			</div>
		{/if}

		<ol class="list-decimal space-y-2 pl-5 text-sm leading-6 text-(--text)/64">
			<li>
				Install the
				<a
					class="font-medium text-(--text) underline underline-offset-4"
					href="https://github.com/mcnaveen/health-connect-webhook/releases/latest"
					target="_blank"
					rel="noreferrer">free FOSS APK</a
				>
				and grant it Health Connect step access.
			</li>
			<li>Enable only <strong class="text-(--text)">Steps</strong> for this webhook.</li>
			<li>Set the Steps resolution to <strong class="text-(--text)">Daily</strong>.</li>
			<li>Add the webhook URL and custom header shown above, then choose a sync schedule.</li>
			<li>Tap <strong class="text-(--text)">Sync now</strong> and refresh this page.</li>
		</ol>

		<form method="POST" action="?/connection" use:enhance>
			<input type="hidden" name="timeZone" value={timeZone} />
			<Button type="submit" variant={data.connection ? 'ghost' : 'default'}>
				{#if data.connection}<RefreshCw class="size-4" />{/if}
				{data.connection ? 'Generate a new token' : 'Create webhook token'}
			</Button>
			{#if data.connection}
				<p class="mt-2 text-xs text-(--text)/48">
					Generating a token immediately invalidates the current one.
				</p>
			{/if}
		</form>
	</section>
</main>

{#snippet Credential(props: { label: string; value: string; copied: boolean; oncopy: () => void })}
	<div class="space-y-1.5">
		<p class="text-xs font-medium text-(--text)/56">{props.label}</p>
		<div class="flex gap-2">
			<Input value={props.value} readonly class="font-mono text-xs" />
			<Button
				type="button"
				size="icon"
				variant="ghost"
				onclick={props.oncopy}
				aria-label={`Copy ${props.label}`}
			>
				{#if props.copied}<Check class="size-4" />{:else}<Clipboard class="size-4" />{/if}
			</Button>
		</div>
	</div>
{/snippet}
