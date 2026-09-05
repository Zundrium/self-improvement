<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
import { watchMotionState } from '$lib/motion/gsap';

let {
	ref = $bindable(null),
	class: className,
	portalProps,
	children,
	...restProps
}: WithoutChildrenOrChild<AlertDialogPrimitive.ContentProps> & {
	portalProps?: AlertDialogPrimitive.PortalProps;
	children: import('svelte').Snippet;
} = $props();
let overlayRef = $state<HTMLElement | null>(null);

$effect(() => {
	if (!ref) return;
	return watchMotionState(ref, 'dialog');
});

$effect(() => {
	if (!overlayRef) return;
	return watchMotionState(overlayRef, 'overlay');
});
</script>

<AlertDialogPrimitive.Portal {...portalProps}>
	<AlertDialogPrimitive.Overlay
		bind:ref={overlayRef}
		data-slot="alert-dialog-overlay"
		class="fixed inset-0 z-50 bg-(--app-overlay-color)/40"
		forceMount
	/>
	<AlertDialogPrimitive.Content bind:ref forceMount {...restProps}>
		{#snippet child({ props })}
			<div
				{...props}
				data-slot="alert-dialog-content"
				class={cn(
					'fixed top-1/2 left-1/2 z-50 flex w-(--app-overlay-width) max-w-md max-h-(--dialog-max-height) overflow-y-auto overscroll-contain -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl bg-(--bg-elevated) p-6 shadow-lg outline-none',
					className
				)}
			>
				{@render children?.()}
			</div>
		{/snippet}
	</AlertDialogPrimitive.Content>
</AlertDialogPrimitive.Portal>
