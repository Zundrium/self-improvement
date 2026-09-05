<script lang="ts">
import { Dialog as DialogPrimitive } from 'bits-ui';
import { cn } from '$lib/utils.js';
import { watchMotionState } from '$lib/motion/gsap';

let {
	ref = $bindable(null),
	class: className,
	...restProps
}: DialogPrimitive.OverlayProps = $props();

$effect(() => {
	if (!ref) return;
	return watchMotionState(ref, 'overlay');
});
</script>

<DialogPrimitive.Overlay
	bind:ref
	data-slot="dialog-overlay"
	class={cn('fixed inset-0 z-50 bg-(--app-overlay-color)/40', className)}
	forceMount
	{...restProps}
/>
