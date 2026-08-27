<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn, type WithoutChild } from '$lib/utils.js';
	import { watchExpanded } from '$lib/motion/gsap';

	let {
		ref = $bindable(null),
		class: className,
		level = 3,
		children,
		...restProps
	}: WithoutChild<AccordionPrimitive.TriggerProps> & {
		level?: AccordionPrimitive.HeaderProps['level'];
	} = $props();

	$effect(() => {
		if (!ref) return;
		return watchExpanded(ref);
	});
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger
		bind:ref
		data-slot="accordion-trigger"
		class={cn(
			'group/accordion flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium tracking-[-0.39px] outline-none hover:text-(--text)/72 disabled:pointer-events-none disabled:opacity-50',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		<ChevronDown
			class="size-4 shrink-0 text-(--text)/40"
			data-motion-chevron="true"
			aria-hidden="true"
		/>
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
