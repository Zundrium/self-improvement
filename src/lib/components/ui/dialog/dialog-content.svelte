<script lang="ts">
	import { X } from '@lucide/svelte';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import DialogOverlay from './dialog-overlay.svelte';
	import DialogPortal from './dialog-portal.svelte';
	import type { Snippet, ComponentProps } from 'svelte';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import { watchMotionState } from '$lib/motion/gsap';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
	} = $props();

	$effect(() => {
		if (!ref) return;
		return watchMotionState(ref, 'dialog');
	});
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content bind:ref forceMount {...restProps}>
		{#snippet child({ props })}
			<div
				{...props}
				data-slot="dialog-content"
				class={cn(
					'fixed top-1/2 left-1/2 z-50 flex w-(--app-overlay-width) max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl bg-(--bg-elevated) p-6 shadow-lg outline-none',
					className
				)}
			>
				{@render children?.()}
				{#if showCloseButton}
					<DialogPrimitive.Close
						data-slot="dialog-close"
						class="absolute end-4 top-4 inline-flex size-8 items-center justify-center rounded-xl text-(--text)/40 hover:bg-(--text)/8 hover:text-(--text) focus-visible:outline-none"
					>
						<X class="size-4" aria-hidden="true" />
						<span class="sr-only">Close</span>
					</DialogPrimitive.Close>
				{/if}
			</div>
		{/snippet}
	</DialogPrimitive.Content>
</DialogPortal>
