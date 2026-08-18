<script lang="ts" module>
	import type { HTMLButtonAttributes } from 'svelte/elements';

	export type MobileButtonProps = HTMLButtonAttributes & {
		variant?: 'default' | 'ghost' | 'destructive';
		size?: 'default' | 'sm';
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		variant = 'default',
		size = 'default',
		class: className,
		type = 'button',
		disabled,
		children,
		...restProps
	}: MobileButtonProps = $props();

	const variants = {
		default: 'bg-(--text) text-(--bg) hover:bg-(--text)/90 font-medium',
		ghost: 'bg-(--text)/5 text-(--text)/72 hover:bg-(--text)/8 hover:text-(--text)',
		destructive: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium dark:text-red-400'
	};

	const sizes = {
		default: 'h-11 rounded-3xl px-5 text-sm',
		sm: 'h-9 rounded-3xl px-3.5 text-sm'
	};
</script>

<button
	data-slot="button"
	class={cn(
		'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition-all duration-150 outline-none select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
		variants[variant],
		sizes[size],
		className
	)}
	{type}
	{disabled}
	{...restProps}
>
	{@render children?.()}
</button>
