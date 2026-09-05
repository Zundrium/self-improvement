<script lang="ts">
import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import { gameGradient } from '$lib/gamification/theme';
import { cn } from '$lib/utils';

type Props = HTMLAttributes<HTMLSpanElement> & {
	colors: { primary: string; secondary: string; tertiary: string };
	children: Snippet;
};

let { colors, children, class: className, ...restProps }: Props = $props();
</script>

<span
	{...restProps}
	class={cn(
		'dynamic-background inline-flex shrink-0 items-center justify-center rounded-full text-(--app-on-color)',
		className
	)}
	style={`--dynamic-background: ${gameGradient(colors)}`}
>
	{@render children()}
</span>
