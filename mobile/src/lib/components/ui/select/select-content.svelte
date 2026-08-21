<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn, type WithoutChild } from '$lib/utils.js';
	import { watchMotionState } from '$lib/motion/gsap';

	let {
		ref = $bindable(null),
		class: className,
		sideOffset = 6,
		portalProps,
		children,
		...restProps
	}: WithoutChild<SelectPrimitive.ContentProps> & {
		portalProps?: SelectPrimitive.PortalProps;
	} = $props();

	$effect(() => {
		if (!ref) return;
		return watchMotionState(ref, 'menu');
	});
</script>

<SelectPrimitive.Portal {...portalProps}>
	<SelectPrimitive.Content
		bind:ref
		{sideOffset}
		data-slot="select-content"
		class={cn(
			'relative z-50 max-h-72 min-w-(--bits-select-anchor-width) overflow-y-auto overscroll-contain rounded-2xl bg-(--bg-elevated) p-1.5 shadow-lg outline-none',
			className
		)}
		forceMount
		{...restProps}
	>
		<SelectPrimitive.Viewport>
			{@render children?.()}
		</SelectPrimitive.Viewport>
	</SelectPrimitive.Content>
</SelectPrimitive.Portal>
