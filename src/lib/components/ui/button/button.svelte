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

	export type ButtonColorProfile = 'plain' | 'highlighted' | 'active' | 'text';
	export type ButtonTone = 'standard' | 'destructive';
	export type ButtonSize = 'small' | 'medium' | 'large';
	export type ButtonFormat = 'text' | 'icon';

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			profile: ButtonColorProfile;
			tone?: ButtonTone;
			size: ButtonSize;
			format?: ButtonFormat;
			motionColors?: GradientColors;
			motionScale?: InteractionScaleOptions;
		};

	const sizes: Record<ButtonSize, string> = {
		small: 'h-11 text-sm',
		medium: 'h-12 text-sm',
		large: 'h-13 text-base'
	};

	const textPadding: Record<ButtonSize, string> = {
		small: 'px-5',
		medium: 'px-6',
		large: 'px-7'
	};

	const formats: Record<ButtonFormat, string> = {
		text: '',
		icon: 'aspect-square shrink-0 px-0'
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
		profile,
		tone = 'standard',
		size,
		format = 'text',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		motionColors,
		motionScale,
		children,
		...restProps
	}: ButtonProps = $props();

	const baseClass =
		'inline-flex cursor-pointer touch-manipulation items-center justify-center rounded-3xl whitespace-nowrap outline-none transition-colors select-none focus-visible:ring-2 focus-visible:ring-(--text)/20 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0';
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		data-color-profile={profile}
		data-tone={tone}
		class={cn(
			baseClass,
			sizes[size],
			formats[format],
			format === 'text' && textPadding[size],
			className
		)}
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
		data-slot="button"
		data-color-profile={profile}
		data-tone={tone}
		class={cn(
			baseClass,
			sizes[size],
			formats[format],
			format === 'text' && textPadding[size],
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

<style>
	[data-slot='button'] {
		--button-primary: var(--motion-primary, var(--tracker-color-primary, var(--text)));
		--button-middle: var(--motion-secondary, var(--tracker-color-middle, var(--text)));
		--button-tertiary: var(--motion-tertiary, var(--tracker-color-tertiary, var(--text)));
	}

	[data-color-profile='plain'] {
		background: color-mix(in srgb, var(--text) 7%, transparent);
		color: color-mix(in srgb, var(--text) 72%, transparent);
	}

	[data-color-profile='plain']:hover {
		background: color-mix(in srgb, var(--text) 11%, transparent);
		color: var(--text);
	}

	[data-color-profile='highlighted'] {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--button-primary) 60%, transparent) 0%,
			color-mix(in srgb, var(--button-middle) 60%, transparent) 52%,
			color-mix(in srgb, var(--button-tertiary) 60%, transparent) 100%
		);
		color: #ffffff;
		font-weight: 500;
	}

	[data-color-profile='highlighted']:hover {
		filter: brightness(1.08);
	}

	[data-color-profile='active'] {
		background: color-mix(in srgb, var(--button-middle) 60%, transparent);
		color: #ffffff;
		font-weight: 500;
	}

	[data-color-profile='active']:hover {
		background: color-mix(in srgb, var(--button-middle) 68%, transparent);
	}

	[data-color-profile='text'] {
		background: transparent;
		color: inherit;
		font-weight: 500;
	}

	[data-color-profile='text']:hover {
		background: transparent;
	}

	[data-tone='destructive'][data-color-profile='plain'],
	[data-tone='destructive'][data-color-profile='text'] {
		color: #dc2626;
	}

	:global(.dark) [data-tone='destructive'][data-color-profile='plain'],
	:global(.dark) [data-tone='destructive'][data-color-profile='text'] {
		color: #f87171;
	}
</style>
