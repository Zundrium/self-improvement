<script lang="ts">
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import { watchMotionState } from '$lib/motion/gsap';

	let {
		ref = $bindable(null),
		sideOffset = 6,
		align = 'start',
		class: className,
		portalProps,
		...restProps
	}: DropdownMenuPrimitive.ContentProps & {
		portalProps?: DropdownMenuPrimitive.PortalProps;
	} = $props();

	$effect(() => {
		if (!ref) return;
		return watchMotionState(ref, 'menu');
	});
</script>

<DropdownMenuPrimitive.Portal {...portalProps}>
	<DropdownMenuPrimitive.Content
		bind:ref
		data-slot="dropdown-menu-content"
		{sideOffset}
		{align}
		class={cn(
			'z-50 min-w-44 origin-(--bits-dropdown-menu-content-transform-origin) overflow-y-auto rounded-2xl bg-(--bg-elevated) p-1.5 shadow-lg outline-none',
			className
		)}
		forceMount
		{...restProps}
	/>
</DropdownMenuPrimitive.Portal>
