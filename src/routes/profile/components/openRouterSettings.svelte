<script lang="ts">
	import { KeyRound, Trash2 } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';

	type Props = {
		apiKey: string;
		configured: boolean;
		loading: boolean;
		busy: boolean;
		onclear: () => void;
	};

	let { apiKey = $bindable(), configured, loading, busy, onclear }: Props = $props();
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
	<CardContent class="space-y-4">
		<Field>
			<FieldLabel for="openrouter-api-key">API key</FieldLabel>
			<Input
				id="openrouter-api-key"
				type="password"
				bind:value={apiKey}
				autocomplete="new-password"
				spellcheck="false"
				placeholder={configured ? 'Enter a new key to replace it' : 'sk-or-v1-…'}
			/>
			<FieldDescription>
				Stored only on this device and excluded from app backups.
			</FieldDescription>
		</Field>
		{#if configured}
			<Button type="button" variant="destructive" disabled={busy} onclick={onclear}>
				<Trash2 class="size-4" /> Remove key
			</Button>
		{/if}
	</CardContent>
</Card>
