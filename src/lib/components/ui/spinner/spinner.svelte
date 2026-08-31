<script lang="ts">
	import { spin } from '$lib/motion/gsap';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="spinner"
	role="status"
	aria-label="Loading"
	use:spin
	class={cn('size-5 rounded-full border-2 border-(--text)/12 border-t-(--text)', className)}
	{...restProps}
></div>
