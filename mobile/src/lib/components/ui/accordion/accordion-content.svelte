<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn, type WithoutChild } from '$lib/utils.js';
	import { watchMotionState } from '$lib/motion/gsap';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithoutChild<AccordionPrimitive.ContentProps> = $props();

	$effect(() => {
		if (!ref) return;
		return watchMotionState(ref, 'accordion');
	});
</script>

<AccordionPrimitive.Content
	bind:ref
	data-slot="accordion-content"
	class="overflow-hidden"
	forceMount
	{...restProps}
>
	<div class={cn('pb-4 text-sm leading-[1.6] tracking-[-0.39px] text-(--text)/72', className)}>
		{@render children?.()}
	</div>
</AccordionPrimitive.Content>
