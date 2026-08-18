<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authClient } from '$lib/auth-client';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Field, FieldGroup, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let password = $state('');
	let confirmation = $state('');
	let message = $state('');
	let loading = $state(false);

	$effect.pre(() => {
		if (!message) message = data.tokenError;
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!data.token) return (message = 'Request a new reset link.');
		if (password !== confirmation) return (message = 'Passwords do not match.');
		loading = true;
		const result = await authClient.resetPassword({ newPassword: password, token: data.token });
		loading = false;
		if (result.error) return (message = result.error.message ?? 'Unable to reset password.');
		await goto(resolve('/sign-in'));
	}
</script>

<svelte:head><title>Reset password · Self Improvement</title></svelte:head>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card class="w-full max-w-sm">
		<CardHeader>
			<CardTitle class="text-xl">Reset password</CardTitle>
			<CardDescription>Choose a new password for your account.</CardDescription>
		</CardHeader>
		<CardContent>
			<form id="reset-password" onsubmit={submit}>
				<FieldGroup>
					{#if message}
						<Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
					{/if}
					<Field>
						<FieldLabel for="password">New password</FieldLabel>
						<Input
							id="password"
							type="password"
							bind:value={password}
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
			</form>
		</CardContent>
		<CardFooter>
			<Button form="reset-password" type="submit" disabled={loading || !data.token}>
				{#if loading}<Spinner class="size-4" />{/if} Reset password
			</Button>
			<Button href="/forgot-password" variant="ghost">Request link</Button>
		</CardFooter>
	</Card>
</main>
