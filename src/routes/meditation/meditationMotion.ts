import { gsap } from 'gsap';
import type { Action } from 'svelte/action';

const ICON_SELECTOR = '[data-meditation-icon]';
const TIMER_SELECTOR = '[data-meditation-timer]';
const SOUND_SELECTOR = '[data-meditation-sound]';

export const meditationEnter: Action<HTMLElement> = (node) => {
	const icon = node.querySelector(ICON_SELECTOR);
	const timer = node.querySelector(TIMER_SELECTOR);
	const sounds = gsap.utils.toArray<HTMLElement>(SOUND_SELECTOR, node);
	const targets = [icon, timer, ...sounds].filter(Boolean);
	if (prefersReducedMotion()) return;
	gsap.set(targets, { autoAlpha: 0 });
	const timeline = createMeditationTimeline(icon, timer, sounds);
	return {
		destroy() {
			timeline.kill();
			gsap.set(targets, { clearProps: 'opacity,visibility' });
		}
	};
};

function createMeditationTimeline(
	icon: Element | null,
	timer: Element | null,
	sounds: HTMLElement[]
) {
	return gsap
		.timeline({ defaults: { ease: 'power2.out' } })
		.to(icon, { autoAlpha: 1, duration: 1.6 })
		.to(timer, { autoAlpha: 1, duration: 1.3 }, '-=0.35')
		.to(sounds, { autoAlpha: 1, duration: 1.1, stagger: 0.24 }, '-=0.25');
}

function prefersReducedMotion() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
