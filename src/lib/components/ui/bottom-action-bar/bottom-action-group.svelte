<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	export type BottomActionGroupOrientation = 'horizontal' | 'vertical';
	export type BottomActionGroupJustify = 'start' | 'center' | 'between';
	export type BottomActionGroupProps = HTMLAttributes<HTMLDivElement> & {
		children: Snippet;
		orientation?: BottomActionGroupOrientation;
		justify?: BottomActionGroupJustify;
	};

	const justifyClasses: Record<BottomActionGroupJustify, string> = {
		start: 'justify-start',
		center: 'justify-center',
		between: 'justify-between'
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		children,
		orientation = 'horizontal',
		justify = 'start',
		class: className,
		...restProps
	}: BottomActionGroupProps = $props();
</script>

<div
	class={cn(
		'flex w-full gap-(--bottom-action-gap)',
		orientation === 'vertical' ? 'flex-col' : 'items-center',
		justifyClasses[justify],
		className
	)}
	data-bottom-action-group
	data-orientation={orientation}
	{...restProps}
>
	{@render children()}
</div>
