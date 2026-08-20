<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	type Props = {
		children: Snippet;
		class?: string;
	};

	let { children, class: className }: Props = $props();
</script>

<div class={cn('grid gap-10 md:grid-cols-2 md:gap-12', className)}>
	{@render children()}
</div>
