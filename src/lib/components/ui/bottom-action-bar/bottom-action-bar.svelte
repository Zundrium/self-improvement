<script lang="ts">
import type { Snippet } from 'svelte';
import { cn } from '$lib/utils';
let {
	children,
	contentClass = 'max-w-(--app-compact-max-width)',
	mobileOnly = true
}: {
	children: Snippet;
	contentClass?: string;
	mobileOnly?: boolean;
} = $props();
</script>

<div class={cn('app-gutter shrink-0 bg-(--bg) py-(--bottom-action-padding-block)', mobileOnly && 'sm:hidden')} data-bottom-action-bar>
	<div class={cn('mx-auto w-full', contentClass)}>{@render children()}</div>
</div>
