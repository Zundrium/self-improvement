<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { apiRequest } from '$lib/api';
	import ThemeToggle from '$lib/components/themeToggle.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import { toast } from '$lib/components/ui/toast';
	import type { LocalProfile } from '$lib/api-types';
	import OpenRouterSettings from './openRouterSettings.svelte';

	let { profile }: { profile: LocalProfile } = $props();
	let name = $state(untrack(() => profile.name));
	let message = $state('');
	let failed = $state(false);
	let busy = $state(false);

	async function updateProfile(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		try {
			await apiRequest('/api/app/profile', {
				method: 'PATCH',
				body: JSON.stringify({ name: name.trim() })
			});
			failed = false;
			message = 'Profile updated.';
			toast.success(message);
			await invalidateAll();
		} catch (cause) {
			failed = true;
			message = cause instanceof Error ? cause.message : 'Could not update your profile.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="space-y-4">
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
		<CardContent>
			<form class="space-y-5" onsubmit={updateProfile}>
				{#if message}
					<Alert variant={failed ? 'destructive' : 'default'}>
						<AlertDescription>{message}</AlertDescription>
					</Alert>
				{/if}
				<Field>
					<FieldLabel for="name">Name</FieldLabel>
					<Input id="name" bind:value={name} minlength={2} required />
				</Field>
				<Button type="submit" disabled={busy}>
					{#if busy}<Spinner class="size-4" />{/if} Save profile
				</Button>
			</form>
		</CardContent>
	</Card>

	<OpenRouterSettings />
</div>
