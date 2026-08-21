<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { watchMotionState } from '$lib/motion/gsap';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 6,
		align = 'center',
		portalProps,
		...restProps
	}: PopoverPrimitive.ContentProps & {
		portalProps?: PopoverPrimitive.PortalProps;
	} = $props();

	$effect(() => {
		if (!ref) return;
		return watchMotionState(ref, 'menu');
	});
</script>

<PopoverPrimitive.Portal {...portalProps}>
	<PopoverPrimitive.Content
		bind:ref
		data-slot="popover-content"
		{sideOffset}
		{align}
		class={cn(
			'z-50 w-72 origin-(--bits-popover-content-transform-origin) rounded-3xl bg-(--bg-elevated) p-5 shadow-lg outline-none',
			className
		)}
		forceMount
		{...restProps}
	/>
</PopoverPrimitive.Portal>
