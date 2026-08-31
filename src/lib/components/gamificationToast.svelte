<script lang="ts" module>
import type { GamificationData } from '$lib/api-types';

export function mergeGamificationBaseline(
	previous: GamificationData,
	next: GamificationData
): GamificationData {
	const previouslyUnlocked = new Set(
		previous.achievements.filter(({ unlocked }) => unlocked).map(({ id }) => id)
	);
	return {
		...next,
		achievements: next.achievements.map((achievement) =>
			previouslyUnlocked.has(achievement.id) ? { ...achievement, unlocked: true } : achievement
		)
	};
}
</script>

<script lang="ts">
import { gsap } from 'gsap';
import { onMount, untrack } from 'svelte';
import { apiRequest, GAMIFICATION_CHANGED_EVENT } from '$lib/api';
import type { AchievementSummary } from '$lib/api-types';
import { Pressable } from '$lib/components/ui/pressable';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '$lib/components/ui/dialog';
import { achievementIcon } from '$lib/local/achievement-icons';
import {
	TRACKER_CELEBRATION_ENDED_EVENT,
	TRACKER_COMPLETED_EVENT
} from '$lib/local/completion-events';
import { getTrackerColors } from '$lib/trackers/registry';

const CELEBRATION_DURATION_MS = 5000;
const CONFETTI_COUNT = 18;

let { gamification }: { gamification: GamificationData } = $props();
let previousGamification: GamificationData | undefined;
let trackerCelebrationActive = false;
let open = $state(false);
let surface = $state<HTMLElement | null>(null);
let activeAchievement = $state<AchievementSummary>();
let queuedAchievements = $state<AchievementSummary[]>([]);
let animationCycle = $state(0);
const colors = $derived(getTrackerColors(activeAchievement?.trackerId ?? 'achievements'));

$effect(() => {
	const nextGamification = gamification;
	untrack(() => announceAndRemember(nextGamification));
});

$effect(() => {
	if (!activeAchievement || !open || !surface) return;
	const animation = animateAchievement(surface);
	const timeout = window.setTimeout(() => (open = false), CELEBRATION_DURATION_MS);
	return () => {
		animation.revert();
		window.clearTimeout(timeout);
	};
});

onMount(() => {
	const startTrackerCelebration = () => {
		trackerCelebrationActive = true;
		suspendActiveAchievement();
	};
	const finishTrackerCelebration = () => {
		trackerCelebrationActive = false;
		showNextAchievement();
	};
	window.addEventListener(TRACKER_COMPLETED_EVENT, startTrackerCelebration, true);
	window.addEventListener(TRACKER_CELEBRATION_ENDED_EVENT, finishTrackerCelebration);
	window.addEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
	return () => {
		window.removeEventListener(TRACKER_COMPLETED_EVENT, startTrackerCelebration, true);
		window.removeEventListener(TRACKER_CELEBRATION_ENDED_EVENT, finishTrackerCelebration);
		window.removeEventListener(GAMIFICATION_CHANGED_EVENT, refreshGamification);
	};
});

let latestRefreshRequest = 0;

async function refreshGamification() {
	const request = ++latestRefreshRequest;
	try {
		const next = await apiRequest<GamificationData>('/api/app/gamification');
		if (request !== latestRefreshRequest) return;
		announceAndRemember(next);
	} catch {
		return;
	}
}

function announceAndRemember(next: GamificationData) {
	const previous = previousGamification;
	const baseline = previous ? mergeGamificationBaseline(previous, next) : next;
	if (previous) queueUnlockedAchievements(previous, baseline);
	previousGamification = baseline;
}

function suspendActiveAchievement() {
	const achievement = activeAchievement;
	if (!achievement) return;
	queuedAchievements = [
		achievement,
		...queuedAchievements.filter(({ id }) => id !== achievement.id)
	];
	activeAchievement = undefined;
	open = false;
}

function queueUnlockedAchievements(previous: GamificationData, next: GamificationData) {
	const unlocked = unlockedSince(previous, next).filter(
		(achievement) =>
			achievement.id !== activeAchievement?.id &&
			!queuedAchievements.some(({ id }) => id === achievement.id)
	);
	if (!unlocked.length) return;
	queuedAchievements = [...queuedAchievements, ...unlocked];
	showNextAchievement();
}

function showNextAchievement() {
	if (trackerCelebrationActive || activeAchievement) return;
	const [nextAchievement, ...remainingAchievements] = queuedAchievements;
	if (!nextAchievement) return;
	queuedAchievements = remainingAchievements;
	activeAchievement = nextAchievement;
	animationCycle += 1;
	open = true;
}

function handleOpenChangeComplete(isOpen: boolean) {
	if (isOpen) return;
	activeAchievement = undefined;
	showNextAchievement();
}

function skipCelebration() {
	open = false;
}

function unlockedSince(previous: GamificationData, next: GamificationData) {
	const unlocked = new Set(
		previous.achievements.filter(({ unlocked }) => unlocked).map(({ id }) => id)
	);
	return next.achievements.filter(
		(achievement) => achievement.unlocked && !unlocked.has(achievement.id)
	);
}

function animateAchievement(node: HTMLElement) {
	return gsap.context(() => {
		if (prefersReducedMotion()) return;
		gsap.fromTo(
			node.querySelector('[data-achievement-progress]'),
			{ scaleX: 0 },
			{ scaleX: 1, duration: CELEBRATION_DURATION_MS / 1000, ease: 'none' }
		);
		gsap
			.timeline()
			.fromTo(
				node.querySelector('[data-achievement-icon]'),
				{ autoAlpha: 0, rotation: -12, scale: 0.35 },
				{ autoAlpha: 1, rotation: 0, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }
			)
			.to(
				node.querySelector('[data-achievement-icon]'),
				{ scale: 0.82, y: -12, duration: 2.5, ease: 'power1.out' },
				1.2
			)
			.to(
				node.querySelector('[data-achievement-copy]'),
				{ autoAlpha: 0, y: -12, duration: 0.4, ease: 'power2.in' },
				4.05
			);
		gsap.fromTo(
			node.querySelector('[data-achievement-halo]'),
			{ autoAlpha: 0.6, scale: 0.5 },
			{ autoAlpha: 0, scale: 2.4, duration: 1.3, delay: 0.2, ease: 'power2.out' }
		);
		gsap.fromTo(
			node.querySelector('[data-achievement-title]'),
			{ autoAlpha: 0, y: 18, scale: 0.7 },
			{
				autoAlpha: 1,
				y: 0,
				scale: 1,
				duration: 0.6,
				delay: 0.48,
				ease: 'back.out(1.7)',
				clearProps: 'opacity,visibility,transform'
			}
		);
		gsap.fromTo(
			node.querySelector('[data-achievement-description]'),
			{ autoAlpha: 0, y: 12 },
			{
				autoAlpha: 1,
				y: 0,
				duration: 0.45,
				delay: 0.88,
				ease: 'power3.out',
				clearProps: 'opacity,visibility,transform'
			}
		);
		animateConfetti(node);
	}, node);
}

function animateConfetti(node: HTMLElement) {
	const particles = node.querySelectorAll('[data-achievement-confetti]');
	particles.forEach((particle, index) => {
		const angle = (index / particles.length) * Math.PI * 2;
		const distance = 48 + (index % 4) * 16;
		gsap
			.timeline({ delay: 0.72 + (index % 3) * 0.025 })
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

function confettiColor(index: number) {
	return index % 3 === 0 ? '#d4a017' : index % 2 ? '#ffffff' : colors.secondary;
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
</script>

<Dialog bind:open onOpenChangeComplete={handleOpenChangeComplete}>
	{#if activeAchievement}
		{@const AchievementIcon = achievementIcon(activeAchievement.icon)}
		{#key animationCycle}
			<DialogContent
				bind:ref={surface}
				showCloseButton={false}
				onclick={skipCelebration}
				onEscapeKeydown={(event) => {
					event.preventDefault();
					skipCelebration();
				}}
				onInteractOutside={(event) => event.preventDefault()}
				class="inset-0 top-0 left-0 z-[70] h-svh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none px-(--app-inset-inline-start) py-0 text-center text-white shadow-none"
				style={`background: linear-gradient(145deg, ${colors.primary}, ${colors.secondary})`}
			>
				<div class="absolute inset-x-0 top-0 z-10 h-1 bg-white/20" aria-hidden="true">
					<div data-achievement-progress class="h-full origin-left rounded-r-full bg-white"></div>
				</div>

				<div class="absolute inset-x-0 top-[10%] flex justify-center" aria-hidden="true">
					<div class="relative flex size-64 items-center justify-center">
						<div data-achievement-halo class="absolute size-56 rounded-full bg-white/28"></div>
						<div
							data-achievement-icon
							class="relative flex size-56 items-center justify-center rounded-full bg-white/16 text-white"
						>
							<AchievementIcon class="size-28" />
						</div>
					</div>
				</div>

				<div data-achievement-copy class="absolute inset-x-6 top-[43%] flex flex-col items-center">
					<p class="text-sm font-semibold tracking-[0.16em] text-white/72 uppercase">
						Achievement unlocked
					</p>
					<DialogTitle
						data-achievement-title
						class="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl"
					>
						{activeAchievement.title}
					</DialogTitle>
					<DialogDescription
						data-achievement-description
						class="mt-4 max-w-sm text-base leading-6 text-white/82"
					>
						{activeAchievement.description}
					</DialogDescription>
				</div>

				<div class="pointer-events-none absolute left-1/2 top-[48%]" aria-hidden="true">
					{#each Array(CONFETTI_COUNT) as _, index}
						<span
							data-achievement-confetti
							class={index % 2 ? 'absolute h-3 w-1 rounded-full' : 'absolute size-2 rounded-full'}
							style={`background: ${confettiColor(index)}`}
						></span>
					{/each}
				</div>

				<Pressable
					class="absolute inset-x-0 bottom-6 mx-auto w-fit px-4 py-3 text-sm font-medium text-white/72 underline-offset-4 hover:text-white focus-visible:rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
					aria-label="Skip achievement celebration"
					onclick={(event) => {
						event.stopPropagation();
						skipCelebration();
					}}
				>
					Skip &gt;
				</Pressable>
			</DialogContent>
		{/key}
	{/if}
</Dialog>
