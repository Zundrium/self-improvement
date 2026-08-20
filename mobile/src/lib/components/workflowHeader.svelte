<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		subtitle?: string;
		leading?: Snippet;
		trailing?: Snippet;
	};

	let { title, subtitle, leading, trailing }: Props = $props();
</script>

<header class="border-b border-(--text)/8 bg-(--bg)">
	<div
		class="mx-auto grid min-h-16 max-w-5xl grid-cols-[minmax(2.5rem,auto)_minmax(0,1fr)_minmax(2.5rem,auto)] items-center gap-3 px-4 sm:px-6"
	>
		<div class="flex min-w-10 items-center justify-center">
			{@render leading?.()}
		</div>
		<div class="min-w-0 text-center">
			<p class="truncate text-sm font-medium">{title}</p>
			{#if subtitle}<p class="truncate text-xs text-(--text)/48">{subtitle}</p>{/if}
		</div>
		<div class="flex min-w-10 items-center justify-center">
			{@render trailing?.()}
		</div>
	</div>
</header>
