<script lang="ts">
import { gsap } from 'gsap';
import { onMount } from 'svelte';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '$lib/components/ui/dialog';
import {
	TRACKER_COMPLETED_EVENT,
	notifyTrackerCelebrationEnded,
	type TrackerCompletionDetail
} from '$lib/local/completion-events';
import { trackerIcons } from '$lib/trackers/icons';
import { type AppTrackerId, appTrackers, isAppTrackerId } from '$lib/trackers/registry';

const CELEBRATION_DURATION_MS = 5000;
const PARTICLE_COUNT = 12;
let open = $state(false);
let surface = $state<HTMLElement | null>(null);
let activeTrackerId = $state<AppTrackerId>();
let queuedTrackerIds = $state<AppTrackerId[]>([]);
const tracker = $derived(appTrackers.find(({ id }) => id === activeTrackerId));

onMount(() => {
	const handleCompletion = (event: Event) => {
		const detail = (event as CustomEvent<TrackerCompletionDetail>).detail;
		if (detail && isAppTrackerId(detail.trackerId)) showCompletion(detail.trackerId);
	};
	window.addEventListener(TRACKER_COMPLETED_EVENT, handleCompletion);
	return () => window.removeEventListener(TRACKER_COMPLETED_EVENT, handleCompletion);
});

$effect(() => {
	if (!activeTrackerId || !open || !surface) return;
	const animation = animateCompletion(surface);
	const timeout = window.setTimeout(() => (open = false), CELEBRATION_DURATION_MS);
	return () => {
		animation.revert();
		window.clearTimeout(timeout);
	};
});

function showCompletion(trackerId: AppTrackerId) {
	if (activeTrackerId === trackerId || queuedTrackerIds.includes(trackerId)) return;
	if (activeTrackerId) {
		queuedTrackerIds = [...queuedTrackerIds, trackerId];
		return;
	}
	activeTrackerId = trackerId;
	open = true;
}

function handleOpenChangeComplete(isOpen: boolean) {
	if (!isOpen) showNextCompletion();
}

function showNextCompletion() {
	activeTrackerId = queuedTrackerIds[0];
	queuedTrackerIds = queuedTrackerIds.slice(1);
	if (activeTrackerId) return void (open = true);
	notifyTrackerCelebrationEnded();
}

function animateCompletion(node: HTMLElement) {
	return gsap.context(() => {
		if (prefersReducedMotion()) return;
		animateIcon(node);
		animateParticles(node);
		animateReveals(node);
		gsap.fromTo(
			node.querySelector('[data-completion-progress]'),
			{ scaleX: 0 },
			{ scaleX: 1, duration: CELEBRATION_DURATION_MS / 1000, ease: 'none' }
		);
	}, node);
}

function animateIcon(node: HTMLElement) {
	gsap.fromTo(
		node.querySelector('[data-completion-icon]'),
		{ rotation: -16, scale: 0.35 },
		{ rotation: 0, scale: 1, duration: 0.8, ease: 'back.out(1.9)' }
	);
	gsap.fromTo(
		node.querySelector('[data-completion-halo]'),
		{ autoAlpha: 0.5, scale: 0.7 },
		{ autoAlpha: 0, scale: 1.8, duration: 1.2, ease: 'power2.out' }
	);
}

function animateParticles(node: HTMLElement) {
	const particles = node.querySelectorAll('[data-completion-particle]');
	particles.forEach((particle, index) => {
		const angle = (index / particles.length) * Math.PI * 2;
		const distance = 72 + (index % 3) * 12;
		gsap.fromTo(
			particle,
			{ autoAlpha: 0, scale: 0, x: 0, y: 0 },
			{
				autoAlpha: 0,
				scale: 1,
				x: Math.cos(angle) * distance,
				y: Math.sin(angle) * distance,
				duration: 1.25,
				delay: 0.12,
				ease: 'power3.out'
			}
		);
	});
}

function animateReveals(node: HTMLElement) {
	gsap.fromTo(
		node.querySelectorAll('[data-completion-reveal]'),
		{ autoAlpha: 0, y: 18, scale: 0.96 },
		{
			autoAlpha: 1,
			y: 0,
			scale: 1,
			duration: 0.55,
			stagger: 0.09,
			delay: 0.2,
			ease: 'power3.out',
			clearProps: 'opacity,visibility,transform'
		}
	);
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
</script>

<Dialog bind:open onOpenChangeComplete={handleOpenChangeComplete}>
	{#if tracker}
		{@const TrackerIcon = trackerIcons[tracker.id]}
		<DialogContent
			bind:ref={surface}
			showCloseButton={false}
			onEscapeKeydown={(event) => event.preventDefault()}
			onInteractOutside={(event) => event.preventDefault()}
			class="inset-0 top-0 left-0 h-svh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center gap-10 overflow-hidden rounded-none bg-(--bg) px-(--app-inset-inline-start) py-12 text-center shadow-none"
		>
			<div class="relative flex size-40 items-center justify-center" aria-hidden="true">
				<div
					data-completion-halo
					class="absolute size-24 rounded-full"
					style={`background: color-mix(in srgb, ${tracker.colors.primary} 24%, transparent)`}
				></div>
				{#each Array(PARTICLE_COUNT) as _, index}
					<span
						data-completion-particle
						class="absolute size-2 rounded-full"
						style={`background: ${index % 2 ? tracker.colors.secondary : tracker.colors.primary}`}
					></span>
				{/each}
				<div
					data-completion-icon
					class="relative flex size-24 items-center justify-center rounded-full"
					style={`background: color-mix(in srgb, ${tracker.colors.primary} 16%, transparent); color: ${tracker.colors.primary}`}
				>
					<TrackerIcon class="size-12" />
				</div>
			</div>
			<DialogHeader class="items-center space-y-2">
				<p data-completion-reveal class="text-sm font-medium" style={`color: ${tracker.colors.primary}`}>
					Tracker complete
				</p>
				<DialogTitle data-completion-reveal class="text-3xl">{tracker.label} complete</DialogTitle>
				<DialogDescription data-completion-reveal>Your daily progress is logged.</DialogDescription>
			</DialogHeader>
			<div
				data-completion-reveal
				class="h-1 w-full max-w-sm overflow-hidden rounded-full bg-(--text)/8"
				aria-hidden="true"
			>
				<div
					data-completion-progress
					class="h-full origin-left rounded-full"
					style={`background: linear-gradient(90deg, ${tracker.colors.primary}, ${tracker.colors.secondary})`}
				></div>
			</div>
		</DialogContent>
	{/if}
</Dialog>
