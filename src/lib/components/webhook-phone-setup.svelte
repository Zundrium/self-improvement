<script lang="ts" module>
	export type WebhookSetupInstructionSegment =
		| { type: 'text'; value: string }
		| { type: 'emphasis'; value: string }
		| { type: 'link'; label: string; href: string };

	export type WebhookSetupInstruction = WebhookSetupInstructionSegment[];
	export type WebhookPhoneConnection = { lastReceivedAt?: unknown };
	export type WebhookPhoneForm = { kind?: string; token?: unknown; error?: unknown };
	export type WebhookPhoneDownload = { href: string; label: string; trailingText: string };
	export type WebhookPhoneSetupProps = {
		connection: WebhookPhoneConnection | null;
		form?: WebhookPhoneForm | null;
		bridgeDescription: string;
		webhookUrl: string;
		tokenHeaderName: string;
		tokenStorageKey: string;
		download: WebhookPhoneDownload;
		instructions: WebhookSetupInstruction[];
		formAction?: string;
		createTokenLabel?: string;
		regenerateTokenLabel?: string;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { Check, Clipboard, RefreshCw, Smartphone } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let {
		connection,
		form = null,
		bridgeDescription,
		webhookUrl,
		tokenHeaderName,
		tokenStorageKey,
		download,
		instructions,
		formAction = '?/connection',
		createTokenLabel = 'Create webhook token',
		regenerateTokenLabel = 'Generate a new token'
	}: WebhookPhoneSetupProps = $props();

	let timeZone = $state('UTC');
	let copiedCredential = $state('');
	let pendingToken = $state('');
	const hasReceivedData = $derived(Boolean(connection?.lastReceivedAt));
	const isConfigured = $derived(Boolean(connection));
	const generatedToken = $derived(readGeneratedToken(form));
	const visibleToken = $derived(hasReceivedData ? '' : generatedToken || pendingToken);
	const setupTitle = $derived(isConfigured ? 'Finish connecting your phone' : 'Connect your phone');

	onMount(() => {
		timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	});

	$effect(() => {
		updateTokenSession();
	});

	function readGeneratedToken(result: WebhookPhoneForm | null) {
		return result?.kind === 'connection' && typeof result.token === 'string' ? result.token : '';
	}

	function updateTokenSession() {
		if (hasReceivedData) return clearPendingToken();
		if (generatedToken) return rememberToken(generatedToken);
		restorePendingToken();
	}

	function restorePendingToken() {
		pendingToken = sessionStorage.getItem(tokenStorageKey) ?? '';
	}

	function rememberToken(token: string) {
		pendingToken = token;
		sessionStorage.setItem(tokenStorageKey, token);
	}

	function clearPendingToken() {
		pendingToken = '';
		sessionStorage.removeItem(tokenStorageKey);
	}

	async function copyCredential(label: string, value: string) {
		await navigator.clipboard.writeText(value);
		copiedCredential = label;
		setTimeout(() => (copiedCredential = ''), 1600);
	}

	function openExternal(url: string) {
		window.open(url, '_blank', 'noopener,noreferrer');
	}
</script>

<section class="mx-auto max-w-3xl space-y-6" aria-labelledby="webhook-setup-title">
	<div class="flex items-center gap-3">
		<span class="flex size-10 items-center justify-center rounded-3xl bg-(--text)/8">
			<Smartphone class="size-5" />
		</span>
		<div>
			<h1 id="webhook-setup-title" class="text-xl font-medium">{setupTitle}</h1>
			<p class="text-sm text-(--text)/56">{bridgeDescription}</p>
		</div>
	</div>

	{#if form?.kind === 'connection' && typeof form.error === 'string'}
		<Alert variant="destructive"><AlertDescription>{form.error}</AlertDescription></Alert>
	{/if}

	{#if visibleToken}
		<Alert>
			<AlertDescription>
				This token stays visible in this browser session until the first sync.
			</AlertDescription>
		</Alert>
	{:else if isConfigured}
		<Alert>
			<AlertDescription>
				The token is hidden. Generate a new token if it is no longer saved on your phone.
			</AlertDescription>
		</Alert>
	{/if}

	{#if isConfigured || visibleToken}
		<div class="space-y-4">
			{@render Credential('Webhook URL', webhookUrl, 'url')}
			{@render Credential('Custom header name', tokenHeaderName, 'header')}
			{#if visibleToken}{@render Credential('Custom header value', visibleToken, 'token')}{/if}
		</div>
	{/if}

	<ol class="list-decimal space-y-2 pl-5 text-sm leading-6 text-(--text)/64">
		<li>
			Install the
			<button
				type="button"
				class="cursor-pointer font-medium text-(--text) underline underline-offset-4"
				onclick={() => openExternal(download.href)}>{download.label}</button
			><span> {download.trailingText}</span>
		</li>
		{#each instructions as instruction, instructionIndex (instructionIndex)}
			<li>
				{#each instruction as segment, segmentIndex (segmentIndex)}
					{#if segment.type === 'text'}
						{segment.value}
					{:else if segment.type === 'emphasis'}
						<strong class="text-(--text)">{segment.value}</strong>
					{:else}
						<button
							type="button"
							class="cursor-pointer font-medium text-(--text) underline underline-offset-4"
							onclick={() => openExternal(segment.href)}>{segment.label}</button
						>
					{/if}
				{/each}
			</li>
		{/each}
	</ol>

	<form method="POST" action={formAction} use:enhance>
		<input type="hidden" name="timeZone" value={timeZone} />
		<Button type="submit" variant={isConfigured ? 'ghost' : 'default'}>
			{#if isConfigured}<RefreshCw class="size-4" />{/if}
			{isConfigured ? regenerateTokenLabel : createTokenLabel}
		</Button>
		{#if isConfigured}
			<p class="mt-2 text-xs text-(--text)/48">
				Generating a token immediately invalidates the current one.
			</p>
		{/if}
	</form>
</section>

{#snippet Credential(label: string, value: string, credential: string)}
	<div class="space-y-1.5">
		<p class="text-xs font-medium text-(--text)/56">{label}</p>
		<div class="flex gap-2">
			<Input {value} readonly class="font-mono text-xs" />
			<Button
				type="button"
				size="icon"
				variant="ghost"
				onclick={() => copyCredential(credential, value)}
				aria-label={`Copy ${label}`}
			>
				{#if copiedCredential === credential}<Check class="size-4" />{:else}<Clipboard
						class="size-4"
					/>{/if}
			</Button>
		</div>
	</div>
{/snippet}
