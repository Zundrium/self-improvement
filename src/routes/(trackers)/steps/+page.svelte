<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, Clipboard, RefreshCw, Smartphone } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Progress } from '$lib/components/ui/progress';
	import { DEFAULT_STEP_GOAL, STEP_TOKEN_HEADER } from './steps';
	import type { PageProps } from './$types';

	const pendingTokenStorageKey = 'pending-step-token';

	let { data, form }: PageProps = $props();
	let timeZone = $state('UTC');
	let copied = $state('');
	let pendingToken = $state('');
	const dailyGoal = $derived(data.connection?.dailyGoal ?? DEFAULT_STEP_GOAL);
	const progress = $derived(Math.min(100, Math.round((data.steps / dailyGoal) * 100)));
	const generatedToken = $derived(
		form?.kind === 'connection' && 'token' in form && typeof form.token === 'string'
			? form.token
			: ''
	);
	const visibleToken = $derived(generatedToken || pendingToken);

	onMount(() => {
		timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		restorePendingToken();
	});

	$effect(() => {
		if (generatedToken) rememberToken(generatedToken);
	});

	function restorePendingToken() {
		if (data.connection?.lastReceivedAt) return sessionStorage.removeItem(pendingTokenStorageKey);
		pendingToken = sessionStorage.getItem(pendingTokenStorageKey) ?? '';
	}

	function rememberToken(token: string) {
		pendingToken = token;
		sessionStorage.setItem(pendingTokenStorageKey, token);
	}

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
		<section class="mx-auto max-w-3xl space-y-6" aria-labelledby="webhook-setup-title">
			<div class="flex items-center gap-3">
				<span class="flex size-10 items-center justify-center rounded-3xl bg-(--text)/8">
					<Smartphone class="size-5" />
				</span>
				<div>
					<h1 id="webhook-setup-title" class="text-xl font-medium">Connect your phone</h1>
					<p class="text-sm text-(--text)/56">Use the free HC Webhook FOSS build as the bridge.</p>
				</div>
			</div>

			{#if form?.kind === 'connection' && form.error}
				<Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>
			{/if}

			{#if visibleToken}
				<Alert>
					<AlertDescription>
						This token stays visible in this browser session until the first sync.
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
						value: visibleToken,
						copied: copied === 'token',
						oncopy: () => copyValue('token', visibleToken)
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
	{/if}
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
