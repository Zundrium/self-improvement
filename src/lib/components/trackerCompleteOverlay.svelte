<script lang="ts">
import { gsap } from 'gsap';
import { onMount } from 'svelte';
import { Button } from '$lib/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '$lib/components/ui/dialog';
import {
	TRACKER_COMPLETED_EVENT,
	type TrackerCompletionDetail
} from '$lib/local/completion-events';
import { trackerIcons } from '$lib/trackers/icons';
import { type AppTrackerId, appTrackers, isAppTrackerId } from '$lib/trackers/registry';

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
	return animateCompletion(surface);
});

$effect(() => {
	if (!open && activeTrackerId) dismissCompletion();
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

function dismissCompletion() {
	activeTrackerId = queuedTrackerIds[0];
	queuedTrackerIds = queuedTrackerIds.slice(1);
	open = Boolean(activeTrackerId);
}

function animateCompletion(node: HTMLElement) {
	const context = gsap.context(() => {
		if (prefersReducedMotion()) return;
		gsap.fromTo(
			node.querySelectorAll('[data-completion-reveal]'),
			{ autoAlpha: 0, y: 16, scale: 0.96 },
			{
				autoAlpha: 1,
				y: 0,
				scale: 1,
				duration: 0.5,
				stagger: 0.08,
				ease: 'power3.out',
				clearProps: 'opacity,visibility,transform'
			}
		);
	});
	return () => context.revert();
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
</script>

<Dialog bind:open>
	{#if tracker}
		{@const TrackerIcon = trackerIcons[tracker.id]}
		<DialogContent
			bind:ref={surface}
			showCloseButton={false}
			class="inset-0 top-0 left-0 h-svh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center gap-8 rounded-none bg-(--bg) px-(--app-inset-inline-start) py-12 text-center shadow-none"
		>
			<div
				data-completion-reveal
				class="flex size-24 items-center justify-center rounded-full"
				style={`background: color-mix(in srgb, ${tracker.colors.primary} 16%, transparent); color: ${tracker.colors.primary}`}
			>
				<TrackerIcon class="size-12" aria-hidden="true" />
			</div>
			<DialogHeader class="items-center space-y-2">
				<p data-completion-reveal class="text-sm font-medium" style={`color: ${tracker.colors.primary}`}>
					Tracker complete
				</p>
				<DialogTitle data-completion-reveal class="text-3xl">{tracker.label} complete</DialogTitle>
				<DialogDescription data-completion-reveal>Your daily progress is logged.</DialogDescription>
			</DialogHeader>
			<Button
				data-completion-reveal
				size="lg"
				class="w-full max-w-sm text-white"
				style={`background: linear-gradient(135deg, ${tracker.colors.primary}, ${tracker.colors.secondary})`}
				onclick={() => (open = false)}
			>
				Done
			</Button>
		</DialogContent>
	{/if}
</Dialog>
