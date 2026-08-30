<script lang="ts">
import { Star } from '@lucide/svelte';
import { gsap } from 'gsap';
import { onMount } from 'svelte';
import { Dialog, DialogContent, DialogTitle } from '$lib/components/ui/dialog';
import {
	TRACKER_COMPLETED_EVENT,
	notifyTrackerCelebrationEnded,
	type TrackerCompletionDetail
} from '$lib/local/completion-events';
import { trackerPoints } from '$lib/local/gamification';
import { trackerIcons } from '$lib/trackers/icons';
import { appTrackers, isAppTrackerId } from '$lib/trackers/registry';

const CELEBRATION_DURATION_MS = 5000;
const CONFETTI_COUNT = 18;
const GLIMMER_COUNT = 5;
const GLIMMER_OFFSETS = [
	{ x: -92, y: 8 },
	{ x: -48, y: -20 },
	{ x: 0, y: -34 },
	{ x: 50, y: -18 },
	{ x: 94, y: 10 }
];

let open = $state(false);
let surface = $state<HTMLElement | null>(null);
let activeCompletion = $state<TrackerCompletionDetail>();
let queuedCompletions = $state<TrackerCompletionDetail[]>([]);
let animationCycle = $state(0);
const tracker = $derived(appTrackers.find(({ id }) => id === activeCompletion?.trackerId));

onMount(() => {
	const handleCompletion = (event: Event) => {
		const detail = (event as CustomEvent<TrackerCompletionDetail>).detail;
		if (!detail || !isAppTrackerId(detail.trackerId)) return;
		showCompletion({
			trackerId: detail.trackerId,
			glimmers: detail.glimmers ?? trackerPoints[detail.trackerId]
		});
	};
	window.addEventListener(TRACKER_COMPLETED_EVENT, handleCompletion);
	return () => window.removeEventListener(TRACKER_COMPLETED_EVENT, handleCompletion);
});

$effect(() => {
	if (!activeCompletion || !open || !surface) return;
	const animation = animateCompletion(surface);
	const timeout = window.setTimeout(() => (open = false), CELEBRATION_DURATION_MS);
	return () => {
		animation.revert();
		window.clearTimeout(timeout);
	};
});

function showCompletion(completion: TrackerCompletionDetail) {
	if (
		activeCompletion?.trackerId === completion.trackerId ||
		queuedCompletions.some(({ trackerId }) => trackerId === completion.trackerId)
	)
		return;
	if (activeCompletion) {
		queuedCompletions = [...queuedCompletions, completion];
		return;
	}
	activeCompletion = completion;
	animationCycle += 1;
	open = true;
}

function handleOpenChangeComplete(isOpen: boolean) {
	if (!isOpen) showNextCompletion();
}

function showNextCompletion() {
	const nextCompletion = queuedCompletions[0];
	queuedCompletions = queuedCompletions.slice(1);
	if (nextCompletion) {
		activeCompletion = nextCompletion;
		animationCycle += 1;
		open = true;
		return;
	}
	activeCompletion = undefined;
	notifyTrackerCelebrationEnded();
}

function animateCompletion(node: HTMLElement) {
	return gsap.context(() => {
		if (prefersReducedMotion()) return;
		animateProgress(node);
		animateIcon(node);
		animateMessage(node);
		animateConfetti(node);
		animateGlimmers(node);
	}, node);
}

function animateProgress(node: HTMLElement) {
	gsap.fromTo(
		node.querySelector('[data-completion-progress]'),
		{ scaleX: 0 },
		{ scaleX: 1, duration: CELEBRATION_DURATION_MS / 1000, ease: 'none' }
	);
}

function animateIcon(node: HTMLElement) {
	const icon = node.querySelector('[data-completion-icon]');
	const halo = node.querySelector('[data-completion-halo]');
	gsap
		.timeline()
		.fromTo(
			icon,
			{ autoAlpha: 0, rotation: -8, scale: 6 },
			{ autoAlpha: 1, rotation: 0, scale: 1, duration: 1.35, ease: 'expo.out' }
		)
		.to(icon, { scale: 0.82, y: -12, duration: 2.75, ease: 'power1.out' }, 1.35)
		.to(icon, { autoAlpha: 0, scale: 0.68, y: -32, duration: 0.55, ease: 'power2.in' }, 4.05);
	gsap.fromTo(
		halo,
		{ autoAlpha: 0.65, scale: 0.55 },
		{ autoAlpha: 0, scale: 2.4, duration: 1.35, delay: 0.2, ease: 'power2.out' }
	);
}

function animateMessage(node: HTMLElement) {
	gsap.fromTo(
		node.querySelector('[data-completion-title]'),
		{ autoAlpha: 0, y: 18, scale: 0.55 },
		{
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.62,
			delay: 0.58,
			ease: 'back.out(1.7)',
			clearProps: 'opacity,visibility,transform'
		}
	);
	gsap.fromTo(
		node.querySelector('[data-completion-glimmers]'),
		{ autoAlpha: 0, y: 12, scale: 0.92 },
		{
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.45,
			delay: 1.12,
			ease: 'power3.out',
			clearProps: 'opacity,visibility,transform'
		}
	);
	gsap.to(node.querySelector('[data-completion-copy]'), {
		autoAlpha: 0,
		y: -14,
		duration: 0.45,
		delay: 4.15,
		ease: 'power2.in'
	});
}

function animateConfetti(node: HTMLElement) {
	const particles = node.querySelectorAll('[data-completion-confetti]');
	particles.forEach((particle, index) => {
		const angle = (index / particles.length) * Math.PI * 2;
		const distance = 46 + (index % 4) * 16;
		gsap
			.timeline({ delay: 0.82 + (index % 3) * 0.025 })
			.fromTo(
				particle,
				{ autoAlpha: 0, scale: 0, x: 0, y: 0 },
				{ autoAlpha: 1, scale: 1, duration: 0.1, ease: 'power2.out' }
			)
			.to(particle, {
				autoAlpha: 0,
				x: Math.cos(angle) * distance,
				y: Math.sin(angle) * distance + 18,
				rotation: 160 + index * 23,
				duration: 0.8,
				ease: 'power2.out'
			});
	});
}

function animateGlimmers(node: HTMLElement) {
	const glimmers = [...node.querySelectorAll<HTMLElement>('[data-completion-glimmer]')];
	const target = document.querySelector<HTMLElement>('[data-glimmer-target]');
	gsap.set(glimmers, { clearProps: 'opacity,visibility,transform' });
	if (target) {
		gsap.killTweensOf(target);
		gsap.set(target, {
			clearProps: 'transform,transformOrigin,backgroundColor,color'
		});
	}
	const targetStyle = target ? getComputedStyle(target) : undefined;
	const targetBackground = targetStyle?.backgroundColor;
	const targetColor = targetStyle?.color;
	const timeline = gsap.timeline();

	glimmers.forEach((glimmer, index) => {
		const offset = GLIMMER_OFFSETS[index];
		timeline.fromTo(
			glimmer,
			{ autoAlpha: 0, scale: 0, x: 0, y: 0, rotation: -30 },
			{
				autoAlpha: 1,
				scale: 1,
				x: offset.x,
				y: offset.y,
				rotation: 0,
				duration: 0.42,
				ease: 'back.out(2)'
			},
			1.32 + index * 0.055
		);
		timeline.to(
			glimmer,
			{
				y: offset.y - 14,
				rotation: (index - 2) * 8,
				duration: 0.5,
				ease: 'sine.inOut'
			},
			1.85 + index * 0.04
		);
		timeline.to(glimmer, { y: offset.y, duration: 0.45, ease: 'sine.inOut' }, 2.35 + index * 0.04);
		timeline.to(
			glimmer,
			{
				autoAlpha: 0,
				x: () => glimmerDestination(node, target).x,
				y: () => glimmerDestination(node, target).y,
				scale: 0.18,
				rotation: 220 + index * 36,
				duration: 0.82,
				ease: 'power3.in'
			},
			2.9 + index * 0.055
		);
	});

	if (target) {
		timeline
			.to(
				target,
				{ backgroundColor: '#d4a017', color: '#ffffff', duration: 0.14, ease: 'power2.out' },
				3.62
			)
			.to(target, { scale: 1.2, duration: 0.16, ease: 'power2.out' }, 3.75)
			.to(
				target,
				{
					scale: 1,
					duration: 0.5,
					ease: 'elastic.out(1, 0.4)',
					clearProps: 'transform,transformOrigin'
				},
				3.91
			)
			.to(
				target,
				{
					backgroundColor: targetBackground,
					color: targetColor,
					duration: 0.35,
					ease: 'power2.out',
					clearProps: 'backgroundColor,color'
				},
				4.22
			);
	}
}

function glimmerDestination(node: HTMLElement, target: HTMLElement | null) {
	if (!target) return { x: 0, y: 180 };
	const surfaceBounds = node.getBoundingClientRect();
	const targetBounds = target.getBoundingClientRect();
	return {
		x: targetBounds.left + targetBounds.width / 2 - surfaceBounds.left - surfaceBounds.width / 2,
		y: targetBounds.top + targetBounds.height / 2 - surfaceBounds.top - surfaceBounds.height * 0.64
	};
}

function confettiColor(index: number) {
	if (index % 3 === 0) return '#d4a017';
	return index % 2 ? '#ffffff' : tracker?.colors.secondary;
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
</script>

<Dialog bind:open onOpenChangeComplete={handleOpenChangeComplete}>
	{#if tracker && activeCompletion}
		{@const TrackerIcon = trackerIcons[tracker.id]}
		{#key animationCycle}
			<DialogContent
				bind:ref={surface}
				showCloseButton={false}
				onEscapeKeydown={(event) => event.preventDefault()}
				onInteractOutside={(event) => event.preventDefault()}
				class="inset-0 top-0 left-0 z-[70] h-svh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none px-(--app-inset-inline-start) py-0 text-center text-white shadow-none"
				style={`background: linear-gradient(145deg, ${tracker.colors.primary}, ${tracker.colors.secondary})`}
			>
				<div class="absolute inset-x-0 top-0 z-10 h-1 bg-white/20" aria-hidden="true">
					<div
						data-completion-progress
						class="h-full origin-left rounded-r-full bg-white"
					></div>
				</div>

				<div
					class="absolute inset-x-0 top-[10%] flex justify-center"
					aria-hidden="true"
				>
					<div class="relative flex size-64 items-center justify-center">
						<div
							data-completion-halo
							class="absolute size-56 rounded-full bg-white/28"
						></div>
						<div
							data-completion-icon
							class="relative flex size-56 items-center justify-center rounded-full bg-white/16 text-white"
						>
							<TrackerIcon class="size-32" />
						</div>
					</div>
				</div>

			<div
				data-completion-copy
				class="absolute inset-x-6 top-[43%] flex flex-col items-center"
			>
				<DialogTitle
					data-completion-title
					class="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl"
				>
					{tracker.label} complete
				</DialogTitle>
				<p
					data-completion-glimmers
					class="mt-4 text-lg font-semibold text-[#d4a017] tabular-nums"
				>
					+{activeCompletion.glimmers.toLocaleString()} Glimmers added
				</p>
			</div>

			<div class="pointer-events-none absolute left-1/2 top-[48%]" aria-hidden="true">
				{#each Array(CONFETTI_COUNT) as _, index}
					<span
						data-completion-confetti
						class={index % 2 ? 'absolute h-3 w-1 rounded-full' : 'absolute size-2 rounded-full'}
						style={`background: ${confettiColor(index)}`}
					></span>
				{/each}
			</div>

			<div class="pointer-events-none absolute left-1/2 top-[64%]" aria-hidden="true">
				{#each Array(GLIMMER_COUNT) as _}
					<span
						data-completion-glimmer
						class="absolute -m-5 flex size-10 items-center justify-center rounded-full text-white"
						style="background: linear-gradient(135deg, #d4a017, #f97316)"
					>
						<Star class="size-5 fill-current" />
					</span>
				{/each}
			</div>
			</DialogContent>
		{/key}
	{/if}
</Dialog>
