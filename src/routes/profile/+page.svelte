<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Avatar } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let name = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmation = $state('');
	let profileMessage = $state('');
	let passwordMessage = $state('');
	let profileFailed = $state(false);
	let passwordFailed = $state(false);
	let savingProfile = $state(false);
	let savingPassword = $state(false);

	$effect.pre(() => {
		if (!name) name = data.profileUser.name;
	});

	async function updateProfile(event: SubmitEvent) {
		event.preventDefault();
		savingProfile = true;
		const result = await authClient.updateUser({ name: name.trim() });
		savingProfile = false;
		profileFailed = Boolean(result.error);
		profileMessage = result.error?.message ?? 'Profile updated.';
		if (!result.error) await invalidateAll();
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		if (newPassword !== confirmation) return passwordError('Passwords do not match.');
		savingPassword = true;
		const result = await authClient.changePassword({
			currentPassword,
			newPassword,
			revokeOtherSessions: true
		});
		savingPassword = false;
		passwordFailed = Boolean(result.error);
		passwordMessage = result.error?.message ?? 'Password changed.';
	}

	function passwordError(message: string) {
		passwordFailed = true;
		passwordMessage = message;
	}

	async function signOut() {
		await authClient.signOut();
		await goto(resolve('/sign-in'));
	}
</script>

<svelte:head><title>Profile · Self Improvement</title></svelte:head>

<main
	class="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-4xl gap-4 p-4 md:grid-cols-[280px_1fr] md:p-8"
>
	<Card>
		<CardContent class="items-center text-center">
			<Avatar size="xl" src={data.profileUser.image ?? undefined} alt={data.profileUser.name} />
			<div>
				<h1 class="text-xl font-semibold">{data.profileUser.name}</h1>
				<p class="text-sm text-(--text)/64">{data.profileUser.email}</p>
			</div>
			<Badge>{data.profileUser.role ?? 'user'}</Badge>
			<div class="flex flex-wrap justify-center gap-2">
				<Button href="/" variant="ghost">Home</Button>
				{#if data.profileUser.role === 'admin'}
					<Button href="/admin" variant="ghost">Users</Button>
				{/if}
				<Button type="button" variant="ghost" onclick={signOut}>Sign out</Button>
			</div>
		</CardContent>
	</Card>

	<div class="space-y-4">
		<Card>
			<CardHeader><CardTitle>Profile</CardTitle></CardHeader>
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
					<Button type="submit" disabled={savingProfile}>
						{#if savingProfile}<Spinner class="size-4" />{/if} Save profile
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
					<Button type="submit" disabled={savingPassword}>
						{#if savingPassword}<Spinner class="size-4" />{/if} Change password
					</Button>
				</form>
			</CardContent>
		</Card>
	</div>
</main>
