<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { apiRequest, recordAchievementEvents } from '$lib/api';
	import ThemeToggle from '$lib/components/themeToggle.svelte';
	import SettingsSaveBar from '$lib/components/settingsSaveBar.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { toast } from '$lib/components/ui/toast';
	import type { LocalProfile } from '$lib/api-types';
	import { localSecretStore } from '$lib/local/secrets';
	import OpenRouterSettings from './openRouterSettings.svelte';

	let { profile }: { profile: LocalProfile } = $props();
	let name = $state(untrack(() => profile.name));
	let savedName = $state(untrack(() => profile.name));
	let apiKey = $state('');
	let configured = $state(false);
	let loadingKey = $state(true);
	let message = $state('');
	let failed = $state(false);
	let busy = $state(false);
	const dirty = $derived(name.trim() !== savedName || Boolean(apiKey.trim()));

	onMount(() => void loadOpenRouterStatus());

	async function loadOpenRouterStatus() {
		try {
			configured = Boolean(await localSecretStore.openRouterApiKey());
			if (configured) await recordAchievementEvents('setup-openrouter-configured');
		} catch {
			toast.error('Could not read the local OpenRouter settings.');
		} finally {
			loadingKey = false;
		}
	}

	async function saveChanges(event: SubmitEvent) {
		event.preventDefault();
		if (busy || !dirty) return;
		busy = true;
		message = '';
		try {
			const trimmedName = name.trim();
			const trimmedApiKey = apiKey.trim();
			await Promise.all([
				trimmedName === savedName
					? Promise.resolve()
					: apiRequest('/api/app/profile', {
							method: 'PATCH',
							body: JSON.stringify({ name: trimmedName })
						}),
				trimmedApiKey ? localSecretStore.saveOpenRouterApiKey(trimmedApiKey) : Promise.resolve()
			]);
			if (trimmedApiKey) {
				await recordAchievementEvents('setup-openrouter-configured');
				configured = true;
				apiKey = '';
			}
			savedName = trimmedName;
			failed = false;
			message = 'Changes saved.';
			toast.success(message);
			await invalidateAll();
		} catch (cause) {
			failed = true;
			message = cause instanceof Error ? cause.message : 'Could not save your changes.';
		} finally {
			busy = false;
		}
	}

	async function clearApiKey() {
		if (busy) return;
		busy = true;
		try {
			await localSecretStore.clearOpenRouterApiKey();
			apiKey = '';
			configured = false;
			toast.success('OpenRouter API key removed.');
		} catch {
			toast.error('Could not remove the OpenRouter API key.');
		} finally {
			busy = false;
		}
	}
</script>

<form id="general-settings" class="space-y-4" onsubmit={saveChanges}>
	<Card>
		<CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
		<CardContent class="flex items-center justify-between gap-4">
			<div>
				<p class="text-sm font-medium">Theme</p>
				<p class="mt-0.5 text-sm text-(--text)/56">Follow your phone or choose an override.</p>
			</div>
			<ThemeToggle />
		</CardContent>
	</Card>

	<Card>
		<CardHeader><CardTitle>Local profile</CardTitle></CardHeader>
		<CardContent class="space-y-5">
			{#if message}
				<Alert variant={failed ? 'destructive' : 'default'}>
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			{/if}
			<Field>
				<FieldLabel for="name">Name</FieldLabel>
				<Input id="name" bind:value={name} minlength={2} required />
			</Field>
		</CardContent>
	</Card>

	<OpenRouterSettings
		bind:apiKey
		{configured}
		loading={loadingKey}
		{busy}
		onclear={clearApiKey}
	/>
</form>

<SettingsSaveBar
	form="general-settings"
	saving={busy}
	{dirty}
	disabled={loadingKey}
	contentClass="max-w-4xl"
/>
