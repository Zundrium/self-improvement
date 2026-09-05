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
import type {
	HTMLAnchorAttributes,
	HTMLButtonAttributes,
	MouseEventHandler,
	KeyboardEventHandler
} from 'svelte/elements';

type ManagedProps =
	| 'children'
	| 'disabled'
	| 'href'
	| 'onclick'
	| 'onauxclick'
	| 'onkeydown'
	| 'ref'
	| 'type';

type PressableSharedProps = WithElementRef<{
	children?: HTMLButtonAttributes['children'];
	disabled?: boolean;
	motionColors?: GradientColors;
	motionScale?: InteractionScaleOptions;
	onclick?: MouseEventHandler<HTMLElement>;
	onauxclick?: MouseEventHandler<HTMLElement>;
	onkeydown?: KeyboardEventHandler<HTMLElement>;
}>;

export type PressableLinkProps = Omit<HTMLAnchorAttributes, ManagedProps> &
	PressableSharedProps & {
		href: string;
		type?: HTMLAnchorAttributes['type'];
	};

export type PressableButtonProps = Omit<HTMLButtonAttributes, ManagedProps> &
	PressableSharedProps & {
		href?: undefined;
		type?: HTMLButtonAttributes['type'];
	};

export type PressableProps = PressableLinkProps | PressableButtonProps;

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
		type,
		disabled,
		motionColors,
		motionScale,
		children,
		onclick,
		onauxclick,
		onkeydown,
		...restProps
	}: PressableProps = $props();

	const anchorProps = $derived(restProps as Omit<HTMLAnchorAttributes, ManagedProps>);
	const buttonProps = $derived(restProps as Omit<HTMLButtonAttributes, ManagedProps>);
	const buttonType = $derived(type as HTMLButtonAttributes['type']);

	const baseClass =
		'inline-flex cursor-pointer touch-manipulation outline-none transition-colors select-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg) disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40';
	function activate(event: MouseEvent & { currentTarget: HTMLElement }, handler: MouseEventHandler<HTMLElement> | null | undefined) {
		if (disabled) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		handler?.(event);
	}

	function keydown(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (disabled) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		onkeydown?.(event);
	}
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="pressable"
		class={cn(baseClass, className)}
		use:gradientColors={motionColors}
		use:optionalInteractionScale={motionScale}
		{...anchorProps}
		{type}
		href={disabled ? undefined : resolveHref(href)}
		aria-disabled={disabled || undefined}
		tabindex={disabled ? -1 : anchorProps.tabindex}
		onclick={(event) => activate(event, onclick)}
		onauxclick={(event) => activate(event, onauxclick)}
		onkeydown={keydown}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="pressable"
		class={cn(baseClass, className)}
		use:gradientColors={motionColors}
		use:optionalInteractionScale={motionScale}
		{...buttonProps}
		type={buttonType ?? 'button'}
		{disabled}
		onclick={(event) => activate(event, onclick)}
		onauxclick={(event) => activate(event, onauxclick)}
		onkeydown={keydown}
	>
		{@render children?.()}
	</button>
{/if}
