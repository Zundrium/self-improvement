<script lang="ts">
import { page } from '$app/state';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

const initializationFailure = $derived(page.error?.message.startsWith('App initialization failed'));
</script>

<svelte:head>
	<title>{page.status} · Self Improvement</title>
</svelte:head>

<main class="app-gutter flex min-h-svh items-center justify-center py-4 text-center">
	<Card class="w-full max-w-sm">
		<CardHeader>
			<p class="text-sm font-medium text-(--text-muted)">{page.status}</p>
			<CardTitle class="text-xl">
				{page.status === 404
					? 'Page not found'
					: initializationFailure
						? 'Local storage could not start'
						: 'Something went wrong'}
			</CardTitle>
		</CardHeader>
		<CardContent class="items-center">
			<p class="text-sm text-(--text)/64">{page.error?.message ?? 'Please try again.'}</p>
				{#if initializationFailure}
					<Button profile="highlighted" size="medium" onclick={() => location.reload()}>Retry</Button>
				{:else}
					<Button profile="highlighted" size="medium" href="/">Go home</Button>
				{/if}
		</CardContent>
	</Card>
</main>
