<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		children: Snippet;
		class?: string;
		contentClass?: string;
	};

	let { children, class: className, contentClass }: Props = $props();
</script>

<main
	class={cn('app-gutter mx-auto w-full max-w-5xl flex-1 pt-6 pb-8 sm:pt-8 sm:pb-10', className)}
>
	<div class={cn('space-y-10', contentClass)}>
		{@render children()}
	</div>
</main>
