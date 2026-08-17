<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
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
	let email = $state('');
	let password = $state('');
	let message = $state('');
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		message = '';
		loading = true;
		const result = await authClient.signIn.email({ email, password });
		loading = false;
		if (result.error) return (message = result.error.message ?? 'Unable to sign in.');
		await goto(resolve(data.redirectTo as Pathname));
	}
</script>

<svelte:head><title>Sign in · Self Improvement</title></svelte:head>

<main class="flex min-h-svh items-center justify-center p-4 sm:p-6">
	<Card class="w-full max-w-sm">
		<CardHeader>
			<CardTitle class="text-xl">Welcome back</CardTitle>
			<CardDescription>Sign in to continue to your daily overview.</CardDescription>
		</CardHeader>
		<CardContent>
			<form id="sign-in-form" onsubmit={submit}>
				<FieldGroup>
					{#if message}
						<Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
					{/if}
					<Field>
						<FieldLabel for="email">Email</FieldLabel>
						<Input id="email" bind:value={email} type="email" autocomplete="email" required />
					</Field>
					<Field>
						<FieldLabel for="password">Password</FieldLabel>
						<Input
							id="password"
							bind:value={password}
							type="password"
							autocomplete="current-password"
							minlength={8}
							required
						/>
					</Field>
					<a
						class="text-sm text-(--text)/64 hover:text-(--text)"
						href={resolve('/forgot-password')}
					>
						Forgot password?
					</a>
				</FieldGroup>
			</form>
		</CardContent>
		<CardFooter>
			<Button class="w-full" form="sign-in-form" type="submit" disabled={loading}>
				{#if loading}<Spinner class="size-4" />{/if} Sign in
			</Button>
		</CardFooter>
	</Card>
</main>
