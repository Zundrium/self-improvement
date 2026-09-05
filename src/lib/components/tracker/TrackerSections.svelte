<script lang="ts">
import type { Snippet } from 'svelte';
import { cn } from '$lib/utils';

type Props = {
	children: Snippet;
	layout?: 'stack' | 'columns';
	class?: string;
};

let { children, layout = 'stack', class: className }: Props = $props();
</script>

<div
	class={cn(layout === 'columns' ? 'grid gap-10 md:grid-cols-2 md:gap-12' : 'space-y-10', className)}
>
	{@render children()}
</div>
