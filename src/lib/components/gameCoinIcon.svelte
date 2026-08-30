<script lang="ts">
import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import { gameGradient } from '$lib/gamification/theme';
import { cn } from '$lib/utils';

type Props = HTMLAttributes<HTMLSpanElement> & {
	colors: { primary: string; secondary: string };
	children: Snippet;
};

let { colors, children, class: className, ...restProps }: Props = $props();
</script>

<span
	{...restProps}
	class={cn(
		'inline-flex shrink-0 items-center justify-center rounded-full text-white',
		className
	)}
	style={`background: ${gameGradient(colors)}`}
>
	{@render children()}
</span>
