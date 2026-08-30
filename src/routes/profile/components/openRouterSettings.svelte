<script lang="ts">
import { KeyRound, Trash2 } from '@lucide/svelte';
import { onMount } from 'svelte';
import { recordAchievementEvents } from '$lib/api';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { Spinner } from '$lib/components/ui/spinner';
import { toast } from '$lib/components/ui/toast';
import { localSecretStore } from '$lib/local/secrets';

let apiKey = $state('');
let configured = $state(false);
let loading = $state(true);
let busy = $state(false);

onMount(() => void loadStatus());

async function loadStatus() {
	try {
		configured = Boolean(await localSecretStore.openRouterApiKey());
		if (configured) await recordAchievementEvents('setup-openrouter-configured');
	} catch {
		toast.error('Could not read the local OpenRouter settings.');
	} finally {
		loading = false;
	}
}

async function saveApiKey(event: SubmitEvent) {
	event.preventDefault();
	busy = true;
	try {
		await localSecretStore.saveOpenRouterApiKey(apiKey);
		await recordAchievementEvents('setup-openrouter-configured');
		apiKey = '';
		configured = true;
		toast.success('OpenRouter API key saved.');
	} catch (cause) {
		toast.error(cause instanceof Error ? cause.message : 'Could not save the API key.');
	} finally {
		busy = false;
	}
}

async function clearApiKey() {
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

<Card>
	<CardHeader class="flex-row items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<KeyRound class="size-4" />
			<CardTitle>OpenRouter</CardTitle>
		</div>
		{#if loading}
			<Spinner class="size-4" />
		{:else}
			<Badge>{configured ? 'Configured' : 'Not configured'}</Badge>
		{/if}
	</CardHeader>
	<CardContent>
		<form class="space-y-4" onsubmit={saveApiKey}>
			<Field>
				<FieldLabel for="openrouter-api-key">API key</FieldLabel>
				<Input
					id="openrouter-api-key"
					type="password"
					bind:value={apiKey}
					autocomplete="new-password"
					spellcheck="false"
					placeholder={configured ? 'Enter a new key to replace it' : 'sk-or-v1-…'}
					required
				/>
				<FieldDescription>
					Stored only on this device and excluded from app backups.
				</FieldDescription>
			</Field>
			<div class="flex flex-wrap gap-2">
				<Button type="submit" disabled={busy || !apiKey.trim()}>
					{#if busy}<Spinner class="size-4" />{/if}
					{configured ? 'Replace key' : 'Save key'}
				</Button>
				{#if configured}
					<Button type="button" variant="destructive" disabled={busy} onclick={clearApiKey}>
						<Trash2 class="size-4" /> Remove key
					</Button>
				{/if}
			</div>
		</form>
	</CardContent>
</Card>
