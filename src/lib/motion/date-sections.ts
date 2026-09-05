import { gsap } from 'gsap';
import type { Action } from 'svelte/action';
import { dateDistance } from './date-navigation';
import { prefersReducedMotion, watchReducedMotion } from './preference';

export const dateSections: Action<HTMLElement, string | undefined> = (node, date) => {
	let currentDate = date;
	let frame = 0;
	let pendingDirection = 0;
	let pendingAll = false;
	let context: gsap.Context | undefined;
	let known = new Set(sectionTargets(node));
	const stop = () => {
		cancelAnimationFrame(frame);
		context?.revert();
		context = undefined;
	};
	const animate = (direction: number, all: boolean) => {
		cancelAnimationFrame(frame);
		if (all) pendingDirection = direction;
		pendingAll ||= all;
		frame = requestAnimationFrame(() => {
			const sections = sectionTargets(node);
			const targets = pendingAll ? sections : sections.filter((section) => !known.has(section));
			const travel = pendingDirection * 12;
			pendingDirection = 0;
			pendingAll = false;
			known = new Set(sections);
			if (!targets.length) return;
			context?.revert();
			if (prefersReducedMotion()) return;
			context = gsap.context(() => {
				gsap.fromTo(
					targets,
					{ x: -travel, opacity: 0.65 },
					{
						x: 0,
						opacity: 1,
						duration: 0.45,
						stagger: 0.035,
						ease: 'power3.out',
						overwrite: 'auto',
						clearProps: 'transform,opacity'
					}
				);
			}, node);
		});
	};
	const observer = new MutationObserver((records) => {
		const addedSection = records.some((record) =>
			[...record.addedNodes].some(
				(child) =>
					child instanceof Element &&
					(child.matches('[data-motion-item]') || child.querySelector('[data-motion-item]'))
			)
		);
		if (addedSection && sectionTargets(node).some((section) => !known.has(section)))
			animate(0, false);
	});
	observer.observe(node, { childList: true, subtree: true });
	const unwatch = watchReducedMotion(stop);
	return {
		update(next) {
			if (next === currentDate) return;
			const direction = currentDate && next ? -Math.sign(dateDistance(currentDate, next)) : 0;
			currentDate = next;
			animate(direction, true);
		},
		destroy() {
			stop();
			observer.disconnect();
			unwatch();
		}
	};
};

function sectionTargets(node: HTMLElement) {
	return [...node.querySelectorAll<HTMLElement>('[data-motion-item]')].filter((target) => {
		const parent = target.parentElement?.closest('[data-motion-item]');
		return !parent || !node.contains(parent);
	});
}
