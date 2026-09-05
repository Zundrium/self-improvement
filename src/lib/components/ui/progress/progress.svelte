<script lang="ts">
import { Progress as ProgressPrimitive } from 'bits-ui';
import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
import { linearProgress } from '$lib/motion/gsap';

let {
	ref = $bindable(null),
	class: className,
	indicatorClass,
	indicatorBackground,
	animated = true,
	max = 100,
	value,
	...restProps
}: WithoutChildrenOrChild<ProgressPrimitive.RootProps> & {
	indicatorClass?: string;
	indicatorBackground?: string;
	animated?: boolean;
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
		class={cn('progress-indicator h-full w-full flex-1 rounded-full', indicatorClass)}
		style:--progress-indicator-background={indicatorBackground ?? 'var(--text)'}
		use:linearProgress={{
			value: (100 * (value ?? 0)) / (max || 1),
			animated
		}}
	></div>
</ProgressPrimitive.Root>
