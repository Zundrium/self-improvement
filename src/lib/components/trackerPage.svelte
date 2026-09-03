<script lang="ts">
	import type { Snippet } from 'svelte';
	import TrackerDailyProgress from '$lib/components/trackerDailyProgress.svelte';
	import type { TrackerProgressPresentation } from '$lib/trackers/progress';
	import { cn } from '$lib/utils';

	type Props = {
		children: Snippet;
		class?: string;
		contentClass?: string;
		progress?: TrackerProgressPresentation;
	};

	let { children, class: className, contentClass, progress }: Props = $props();
</script>

<main class={cn('app-gutter mx-auto w-full max-w-5xl flex-1 pb-8 sm:pb-10', className)}>
	{#if progress}<TrackerDailyProgress {...progress} />{/if}
	<div class={cn('space-y-10', progress && 'mt-10', contentClass)}>
		{@render children()}
	</div>
</main>
