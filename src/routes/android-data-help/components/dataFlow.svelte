<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	let { items }: { items: string[] } = $props();
</script>

<div class="flex flex-wrap items-center gap-2" aria-label={items.join(' to ')}>
	{#each items as item, index (item)}
		<span class="rounded-full bg-(--text)/6 px-3 py-1.5 text-xs font-medium">{item}</span>
		{#if index < items.length - 1}<ArrowRight class="size-3.5 text-(--text)/32" />{/if}
	{/each}
</div>
