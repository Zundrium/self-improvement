<script lang="ts">
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
	import { Field, FieldLabel } from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import { Spinner } from '$lib/components/ui/spinner';

	let email = $state('');
	let message = $state('');
	let failed = $state(false);
	let loading = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		loading = true;
		const result = await authClient.requestPasswordReset({
			email,
			redirectTo: 'https://self.zund.cc/api/mobile/reset-password'
		});
		loading = false;
		failed = Boolean(result.error);
		message = result.error?.message ?? 'If the account exists, a reset link has been sent.';
	}
</script>

<svelte:head><title>Forgot password · Self Improvement</title></svelte:head>

<main class="flex min-h-svh items-center justify-center p-4">
	<Card class="w-full max-w-sm">
		<CardHeader>
			<CardTitle class="text-xl">Forgot password</CardTitle>
			<CardDescription>Request a secure password reset link.</CardDescription>
		</CardHeader>
		<CardContent>
			<form id="reset-request" class="space-y-5" onsubmit={submit}>
				{#if message}
					<Alert variant={failed ? 'destructive' : 'default'}>
						<AlertDescription>{message}</AlertDescription>
					</Alert>
				{/if}
				<Field>
					<FieldLabel for="email">Email</FieldLabel>
					<Input id="email" type="email" bind:value={email} autocomplete="email" required />
				</Field>
			</form>
		</CardContent>
		<CardFooter>
			<Button form="reset-request" type="submit" disabled={loading}>
				{#if loading}<Spinner class="size-4" />{/if} Send reset link
			</Button>
			<Button href="/sign-in" variant="ghost">Sign in</Button>
		</CardFooter>
	</Card>
</main>
