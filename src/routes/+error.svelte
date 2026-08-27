<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>{page.status} · Self Improvement</title>
</svelte:head>

<main class="app-gutter flex min-h-svh items-center justify-center py-4 text-center">
	<Card class="w-full max-w-sm">
		<CardHeader>
			<p class="text-sm font-medium text-(--text)/56">{page.status}</p>
			<CardTitle class="text-xl">
				{page.status === 404 ? 'Page not found' : 'Something went wrong'}
			</CardTitle>
		</CardHeader>
		<CardContent class="items-center">
			<p class="text-sm text-(--text)/64">{page.error?.message ?? 'Please try again.'}</p>
			<Button href="/">Go home</Button>
		</CardContent>
	</Card>
</main>
