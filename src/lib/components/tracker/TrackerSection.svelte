<script lang="ts">
import type { Snippet } from 'svelte';
import { cn } from '$lib/utils';
import type { TrackerColors } from '$lib/trackers/registry';

type Props = {
	description?: string;
	colors?: TrackerColors;
	children: Snippet;
	trailing?: Snippet;
	class?: string;
	contentClass?: string;
} & ({ title: string; ariaLabel?: string } | { title?: never; ariaLabel: string });

let {
	title,
	ariaLabel,
	description,
	colors,
	children,
	trailing,
	class: className,
	contentClass
}: Props = $props();
</script>

<section class={cn('space-y-5', className)} aria-label={ariaLabel ?? title} data-motion-item>
	{#if title || description || trailing}
		<header class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				{#if title}
					<h2
						class="tracker-title-color tracker-section-title text-xl font-medium tracking-[-0.035em]"
						style:--tracker-section-color={colors?.secondary ?? 'var(--tracker-color-middle)'}
					>
						{title}
					</h2>
				{/if}
				{#if description}
					<p class="mt-0.5 text-sm leading-5 text-(--text-muted)">{description}</p>
				{/if}
			</div>
			{#if trailing}
				<div class="shrink-0">{@render trailing()}</div>
			{/if}
		</header>
	{/if}
	<div class={contentClass}>
		{@render children()}
	</div>
</section>
