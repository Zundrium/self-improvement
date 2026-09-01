<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import type { TrackerColors } from '$lib/trackers/registry';

	type Props = {
		title: string;
		description?: string;
		colors?: TrackerColors;
		children: Snippet;
		trailing?: Snippet;
		class?: string;
		contentClass?: string;
	};

	let {
		title,
		description,
		colors,
		children,
		trailing,
		class: className,
		contentClass
	}: Props = $props();
</script>

<section class={cn('space-y-5', className)} aria-label={title} data-motion-item>
	<header class="flex items-start justify-between gap-4">
		<div class="min-w-0">
			<h2
				class="tracker-title-color tracker-section-title text-xl font-medium tracking-[-0.035em]"
				style:--tracker-section-color={colors?.secondary ?? 'var(--tracker-color-middle)'}
			>
				{title}
			</h2>
			{#if description}
				<p class="mt-0.5 text-sm leading-5 text-(--text)/48">{description}</p>
			{/if}
		</div>
		{#if trailing}
			<div class="shrink-0">{@render trailing()}</div>
		{/if}
	</header>
	<div class={contentClass}>
		{@render children()}
	</div>
</section>
