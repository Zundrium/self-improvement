<script lang="ts">
	import { Progress as ProgressPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import { linearProgress } from '$lib/motion/gsap';

	let {
		ref = $bindable(null),
		class: className,
		indicatorClass,
		indicatorStyle,
		max = 100,
		value,
		...restProps
	}: WithoutChildrenOrChild<ProgressPrimitive.RootProps> & {
		indicatorClass?: string;
		indicatorStyle?: string;
	} = $props();
</script>

<ProgressPrimitive.Root
	bind:ref
	data-slot="progress"
	class={cn('relative h-2 w-full overflow-hidden rounded-full bg-(--text)/8', className)}
	{value}
	{max}
	{...restProps}
>
	<div
		data-slot="progress-indicator"
		class={cn('h-full w-full flex-1 rounded-full bg-(--text)', indicatorClass)}
		style={indicatorStyle}
		use:linearProgress={(100 * (value ?? 0)) / (max || 1)}
	></div>
</ProgressPrimitive.Root>
