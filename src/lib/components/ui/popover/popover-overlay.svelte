<script lang="ts">
	import { Popover as PopoverPrimitive } from 'bits-ui';
	import { watchMotionState } from '$lib/motion/gsap';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		...restProps
	}: PopoverPrimitive.OverlayProps & {
		portalProps?: PopoverPrimitive.PortalProps;
	} = $props();

	$effect(() => {
		if (!ref) return;
		return watchMotionState(ref, 'overlay');
	});
</script>

<PopoverPrimitive.Portal {...portalProps}>
	<PopoverPrimitive.Overlay
		bind:ref
		data-slot="popover-overlay"
		class={cn('fixed inset-0 z-[60] bg-(--app-overlay-color)/20', className)}
		forceMount
		{...restProps}
	/>
</PopoverPrimitive.Portal>
