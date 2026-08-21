<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { authClient } from '$lib/auth-client';
	import ThemeToggle from '$lib/components/themeToggle.svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { AppUser } from '$lib/api-types';

	let { user }: { user: AppUser } = $props();
	let name = $state(untrack(() => user.name));
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmation = $state('');
	let profileMessage = $state('');
	let profileFailed = $state(false);
	let passwordMessage = $state('');
	let passwordFailed = $state(false);
	let busy = $state('');

	async function updateProfile(event: SubmitEvent) {
		event.preventDefault();
		busy = 'profile';
		const result = await authClient.updateUser({ name: name.trim() });
		busy = '';
		profileFailed = Boolean(result.error);
		profileMessage = result.error?.message ?? 'Profile updated.';
		if (!result.error) await invalidateAll();
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		if (newPassword !== confirmation) return showPasswordError('Passwords do not match.');
		busy = 'password';
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true
		});
		busy = '';
		passwordFailed = Boolean(result.error);
		passwordMessage = result.error?.message ?? 'Password changed.';
	}

	function showPasswordError(message: string) {
		passwordFailed = true;
		passwordMessage = message;
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
		<CardHeader><CardTitle>Account</CardTitle></CardHeader>
		<CardContent>
			<form class="space-y-5" onsubmit={updateProfile}>
				{#if profileMessage}
					<Alert variant={profileFailed ? 'destructive' : 'default'}>
						<AlertDescription>{profileMessage}</AlertDescription>
					</Alert>
				{/if}
				<Field>
					<FieldLabel for="name">Name</FieldLabel>
					<Input id="name" bind:value={name} minlength={2} required />
				</Field>
				<Button type="submit" disabled={busy === 'profile'}>
					{#if busy === 'profile'}<Spinner class="size-4" />{/if} Save account
				</Button>
			</form>
		</CardContent>
	</Card>

	<Card>
		<CardHeader><CardTitle>Change password</CardTitle></CardHeader>
		<CardContent>
			<form class="space-y-5" onsubmit={changePassword}>
				{#if passwordMessage}
					<Alert variant={passwordFailed ? 'destructive' : 'default'}>
						<AlertDescription>{passwordMessage}</AlertDescription>
					</Alert>
				{/if}
				<FieldGroup>
					<Field>
						<FieldLabel for="current-password">Current password</FieldLabel>
						<Input
							id="current-password"
							type="password"
							bind:value={currentPassword}
							autocomplete="current-password"
							minlength={8}
							required
						/>
					</Field>
					<Field>
						<FieldLabel for="new-password">New password</FieldLabel>
						<Input
							id="new-password"
							type="password"
							bind:value={newPassword}
							autocomplete="new-password"
							minlength={8}
							required
						/>
					</Field>
					<Field>
						<FieldLabel for="confirmation">Confirm password</FieldLabel>
						<Input
							id="confirmation"
							type="password"
							bind:value={confirmation}
							autocomplete="new-password"
							minlength={8}
							required
						/>
					</Field>
				</FieldGroup>
				<Button type="submit" disabled={busy === 'password'}>
					{#if busy === 'password'}<Spinner class="size-4" />{/if} Change password
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
