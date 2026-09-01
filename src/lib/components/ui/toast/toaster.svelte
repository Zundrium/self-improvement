<script lang="ts">
	import { CircleAlert, CircleCheck, Info, X } from '@lucide/svelte';
	import { gsap } from 'gsap';
	import { Button } from '$lib/components/ui/button';
	import { type Toast, type ToastId, toast, toastStore } from './toast';

	type Props = {
		position?: 'bottom-center' | 'top-center';
		offset?: { bottom?: string; top?: string };
	};

	let { position = 'top-center', offset }: Props = $props();
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

	function swipeDismiss(node: HTMLElement, id: ToastId) {
		let startX = 0;
		let distance = 0;
		let dragging = false;
		const pointerDown = (event: PointerEvent) => {
			if (event.button !== 0 || (event.target as HTMLElement).closest('button, a')) return;
			dragging = true;
			startX = event.clientX;
			node.setPointerCapture(event.pointerId);
		};
		const pointerMove = (event: PointerEvent) => {
			if (!dragging) return;
			distance = event.clientX - startX;
			gsap.set(node, {
				x: distance,
				opacity: 1 - Math.min(Math.abs(distance) / node.offsetWidth, 0.65)
			});
		};
		const pointerEnd = (event: PointerEvent) => {
			if (!dragging) return;
			dragging = false;
			if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
			settleSwipe(node, id, distance);
			distance = 0;
		};
		node.addEventListener('pointerdown', pointerDown);
		node.addEventListener('pointermove', pointerMove);
		node.addEventListener('pointerup', pointerEnd);
		node.addEventListener('pointercancel', pointerEnd);
		return {
			destroy() {
				node.removeEventListener('pointerdown', pointerDown);
				node.removeEventListener('pointermove', pointerMove);
				node.removeEventListener('pointerup', pointerEnd);
				node.removeEventListener('pointercancel', pointerEnd);
				gsap.killTweensOf(node);
			}
		};
	}

	function settleSwipe(node: HTMLElement, id: ToastId, distance: number) {
		if (Math.abs(distance) >= node.offsetWidth * 0.3) return dismissWithSwipe(node, id, distance);
		gsap.to(node, {
			x: 0,
			opacity: 1,
			duration: prefersReducedMotion() ? 0 : 0.22,
			ease: 'power2.out',
			clearProps: 'opacity,transform'
		});
	}

	function dismissWithSwipe(node: HTMLElement, id: ToastId, distance: number) {
		gsap.to(node, {
			x: Math.sign(distance) * (window.innerWidth + node.offsetWidth),
			autoAlpha: 0,
			duration: prefersReducedMotion() ? 0 : 0.18,
			ease: 'power2.in',
			onComplete: () => toast.dismiss(id)
		});
	}

	function toastColor(type: Toast['type']) {
		if (type === 'error') return 'bg-red-500';
		if (type === 'success') return 'bg-emerald-500';
		if (type === 'default') return 'bg-blue-500';
		return '';
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
	class={`pointer-events-none fixed left-1/2 ${placement} z-[60] flex w-(--app-overlay-width) max-w-sm -translate-x-1/2 flex-col gap-2`}
	class:flex-col-reverse={position === 'bottom-center'}
	style={offsetStyle}
	aria-live="polite"
	aria-atomic="true"
>
	{#each $toastStore as item (item.id)}
		<article
			use:toastMotion={item.closing}
			use:swipeDismiss={item.id}
			class={`pointer-events-auto flex touch-pan-y items-center gap-4 rounded-3xl px-5 py-4 text-white ${toastColor(item.type)}`}
			role={item.type === 'error' ? 'alert' : 'status'}
		>
			{#if item.type === 'error'}
				<CircleAlert class="size-10 shrink-0" aria-hidden="true" />
			{:else if item.type === 'success'}
				<CircleCheck class="size-10 shrink-0" aria-hidden="true" />
			{:else}
				<Info class="size-10 shrink-0" aria-hidden="true" />
			{/if}
			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium leading-5">{item.message}</p>
				{#if item.description}
					<p class="mt-0.5 text-sm leading-5 text-white/80">{item.description}</p>
				{/if}
				{#if item.action}
					<Button profile="highlighted"
						size="small"
						class="mt-2"
						onclick={() => runAction(item)}>{item.action.label}</Button
					>
				{/if}
			</div>
			<Button
				profile="text"
				size="small"
				format="icon"
				class="self-center"
				aria-label={`Dismiss ${item.message}`}
				onclick={() => toast.dismiss(item.id)}
			><X class="size-5" aria-hidden="true" /></Button>
		</article>
	{/each}
</div>
