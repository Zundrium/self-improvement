<script lang="ts">
import PageActionBar from '$lib/components/app/PageActionBar.svelte';
import { Form } from '$lib/components/ui/form';
import { APP_RESOURCES, refreshAppData } from '$lib/app/resources';
import { onMount, untrack } from 'svelte';
import { apiRequest } from '$lib/api';
import ThemeToggle from '$lib/components/app/ThemeToggle.svelte';
import SettingsSaveBar from '$lib/components/forms/SettingsSaveBar.svelte';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { toast } from '$lib/components/ui/toast';
import type { LocalProfile } from '$lib/api-types';
import { localSecretStore } from '$lib/local/secrets';
import OpenRouterSettings from './openRouterSettings.svelte';
import { submittedSnapshot } from '$lib/forms/draft';
import { guardUnsavedNavigation } from '$lib/forms/unsaved-navigation.svelte';

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
guardUnsavedNavigation(() => dirty && !busy);
$effect(() => {
	if (!busy && name.trim() === savedName && profile.name !== savedName)
		name = savedName = profile.name;
});

onMount(() => void loadOpenRouterStatus());

async function loadOpenRouterStatus() {
	try {
		configured = Boolean(await localSecretStore.openRouterApiKey());
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
		const submitted = submittedSnapshot({ name: name.trim(), apiKey: apiKey.trim() });
		await Promise.all([
			submitted.name === savedName
				? Promise.resolve()
				: apiRequest('/api/app/profile', {
						method: 'PATCH',
						body: JSON.stringify({ name: submitted.name })
					}),
			submitted.apiKey ? localSecretStore.saveOpenRouterApiKey(submitted.apiKey) : Promise.resolve()
		]);
		if (submitted.apiKey) {
			configured = true;
			if (apiKey.trim() === submitted.apiKey) apiKey = '';
		}
		savedName = submitted.name;
		failed = false;
		message = 'Changes saved.';
		toast.success(message);
		await refreshAppData(APP_RESOURCES.bootstrap).catch(() => {
			failed = true;
			message = 'Saved, but could not refresh the page.';
		});
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

<Form id="general-settings" class="space-y-4" onsubmit={saveChanges}>
	<Card>
		<CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
		<CardContent class="flex items-center justify-between gap-4">
			<div>
				<p class="text-sm font-medium">Theme</p>
				<p class="mt-0.5 text-sm text-(--text-muted)">Follow your phone or choose an override.</p>
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
</Form>

<PageActionBar mobileOnly={false} contentClass="max-w-4xl">
<SettingsSaveBar
	form="general-settings"
	saving={busy}
	{dirty}
	disabled={loadingKey}
/>
</PageActionBar>
