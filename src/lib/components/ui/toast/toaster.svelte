<script lang="ts">
import { CircleAlert, CircleCheck, X } from '@lucide/svelte';
import { gsap } from 'gsap';
import { Button } from '$lib/components/ui/button';
import { type Toast, toast, toastStore } from './toast';

type Props = {
	position?: 'bottom-center' | 'top-center';
	offset?: { bottom?: string; top?: string };
};

let { position = 'bottom-center', offset }: Props = $props();
const placement = $derived(position === 'top-center' ? 'top-4' : 'bottom-4');
const offsetStyle = $derived(
	position === 'top-center'
		? `top: ${offset?.top ?? '1rem'}`
		: `bottom: ${offset?.bottom ?? '1rem'}`
);

function toastMotion(node: HTMLElement, closing: boolean) {
	let tween = enterToast(node);
	if (closing) tween = exitToast(node);
	return {
		update(next: boolean) {
			if (next && !closing) tween = exitToast(node);
			closing = next;
		},
		destroy: () => tween?.kill()
	};
}

function enterToast(node: HTMLElement) {
	if (prefersReducedMotion()) return;
	return gsap.fromTo(
		node,
		{ autoAlpha: 0, y: position === 'top-center' ? -12 : 12, scale: 0.98 },
		{
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.28,
			ease: 'power2.out',
			clearProps: 'opacity,visibility,transform'
		}
	);
}

function exitToast(node: HTMLElement) {
	if (prefersReducedMotion()) return;
	return gsap.to(node, {
		autoAlpha: 0,
		y: position === 'top-center' ? -8 : 8,
		scale: 0.98,
		duration: 0.18,
		ease: 'power2.in'
	});
}

function runAction(item: Toast) {
	item.action?.onClick();
	toast.dismiss(item.id);
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
</script>

<div
	class={`pointer-events-none fixed ${placement} z-[60] flex w-(--app-overlay-width) max-w-sm flex-col gap-2`}
	class:flex-col-reverse={position === 'bottom-center'}
	style={offsetStyle}
	aria-live="polite"
	aria-atomic="true"
>
	{#each $toastStore as item (item.id)}
		<article
			use:toastMotion={item.closing}
			class="pointer-events-auto flex items-start gap-3 rounded-3xl bg-(--bg-elevated) px-4 py-3.5 text-(--text) ring-1 ring-(--text)/8"
			role={item.type === 'error' ? 'alert' : 'status'}
		>
			{#if item.type === 'error'}
				<CircleAlert class="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
			{:else}
				<CircleCheck
					class="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
					aria-hidden="true"
				/>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium leading-5">{item.message}</p>
				{#if item.description}
					<p class="mt-0.5 text-sm leading-5 text-(--text)/56">{item.description}</p>
				{/if}
				{#if item.action}
					<Button
						size="sm"
						class="mt-2 h-7 bg-(--text)/6 px-3 text-xs hover:bg-(--text)/10"
						onclick={() => runAction(item)}>{item.action.label}</Button
					>
				{/if}
			</div>
			<Button
				variant="ghost"
				size="icon"
				class="-mr-1 -mt-1 size-8 text-(--text)/48 hover:text-(--text)"
				aria-label={`Dismiss ${item.message}`}
				onclick={() => toast.dismiss(item.id)}
			><X class="size-4" aria-hidden="true" /></Button>
		</article>
	{/each}
</div>
