<script lang="ts" module>
	import { resolve } from '$app/paths';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import {
		gradientColors,
		interactionScale,
		type GradientColors,
		type InteractionScaleOptions
	} from '$lib/motion/gsap';
	import type { Action } from 'svelte/action';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export type ButtonVariant = 'default' | 'ghost' | 'destructive' | 'link' | 'plain';
	export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'none';

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			motionColors?: GradientColors;
			motionScale?: InteractionScaleOptions;
		};

	const variants: Record<ButtonVariant, string> = {
		default: 'bg-(--text) text-(--bg) hover:bg-(--text)/90 font-medium',
		ghost: 'bg-(--text)/5 text-(--text)/72 hover:bg-(--text)/8 hover:text-(--text)',
		destructive: 'bg-red-500/10 text-red-600 hover:bg-red-500/20 font-medium dark:text-red-400',
		link: 'bg-transparent font-medium text-(--text) hover:text-(--text)',
		plain: 'bg-transparent text-inherit'
	};

	const sizes: Record<ButtonSize, string> = {
		default: 'h-10 rounded-3xl px-4 text-sm',
		sm: 'h-9 rounded-3xl px-3.5 text-sm',
		lg: 'h-11 rounded-3xl px-5 text-base',
		icon: 'size-10 rounded-3xl shrink-0',
		none: ''
	};

	const optionalInteractionScale: Action<HTMLElement, InteractionScaleOptions | undefined> = (
		node,
		options
	) => {
		let action = options ? interactionScale(node, options) : undefined;
		return {
			update(next) {
				if (action && next) action.update?.(next);
				else if (action) {
					action.destroy?.();
					action = undefined;
				} else if (next) action = interactionScale(node, next);
			},
			destroy() {
				action?.destroy?.();
			}
		};
	};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		motionColors,
		motionScale,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(
			'inline-flex cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap outline-none transition-colors select-none focus-visible:ring-2 focus-visible:ring-(--text)/20 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
			variants[variant],
			sizes[size],
			className
		)}
		href={disabled ? undefined : resolve(href as '/')}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		use:gradientColors={motionColors}
		use:optionalInteractionScale={motionScale}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(
			'inline-flex cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap outline-none transition-colors select-none focus-visible:ring-2 focus-visible:ring-(--text)/20 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
			variants[variant],
			sizes[size],
			className
		)}
		{type}
		{disabled}
		use:gradientColors={motionColors}
		use:optionalInteractionScale={motionScale}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
