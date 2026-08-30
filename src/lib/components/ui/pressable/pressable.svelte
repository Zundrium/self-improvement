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

export type PressableProps = WithElementRef<HTMLButtonAttributes> &
	WithElementRef<HTMLAnchorAttributes> & {
		motionColors?: GradientColors;
		motionScale?: InteractionScaleOptions;
	};

function resolveHref(href: string) {
	return href.startsWith('/') ? resolve(href as '/') : href;
}

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
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		motionColors,
		motionScale,
		children,
		...restProps
	}: PressableProps = $props();

	const baseClass =
		'inline-flex cursor-pointer touch-manipulation outline-none transition-colors select-none focus-visible:ring-2 focus-visible:ring-(--text)/20 disabled:pointer-events-none disabled:opacity-40';
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="pressable"
		class={cn(baseClass, className)}
		href={disabled ? undefined : resolveHref(href)}
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
		data-slot="pressable"
		class={cn(baseClass, className)}
		{type}
		{disabled}
		use:gradientColors={motionColors}
		use:optionalInteractionScale={motionScale}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
