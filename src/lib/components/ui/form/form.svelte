<script lang="ts" module>
	import type { WithElementRef } from '$lib/utils.js';
	import type { HTMLFormAttributes } from 'svelte/elements';

	export type FormProps = WithElementRef<HTMLFormAttributes, HTMLFormElement>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: FormProps = $props();
</script>

<form bind:this={ref} data-slot="form" class={cn('space-y-6', className)} {...restProps}>
	{@render children?.()}
</form>
