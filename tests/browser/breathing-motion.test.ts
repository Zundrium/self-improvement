import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import { gsap } from 'gsap';
import BreathingExerciseSection from '../../src/routes/breathing/components/breathingExerciseSection.svelte';
import {
	breathingHoldProgress,
	breathingPhaseScale,
	type BreathingMotionOptions
} from '../../src/routes/breathing/breathingMotion';
import '../../src/routes/global.css';

const mounted: ReturnType<typeof mount>[] = [];
const cleanup: Array<() => void> = [];
afterEach(async () => {
	for (const destroy of cleanup.splice(0)) destroy();
	for (const component of mounted.splice(0)) await unmount(component);
	vi.restoreAllMocks();
	document.body.innerHTML = '';
	document.documentElement.classList.remove('dark');
});

function finishMotion(node: HTMLElement) {
	for (const tween of gsap.getTweensOf(node)) tween.progress(1);
}

async function spheres(reducedMotion = false) {
	const matchMedia = window.matchMedia.bind(window);
	vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
		const result = matchMedia(query);
		if (query === '(prefers-reduced-motion: reduce)') {
			Object.defineProperty(result, 'matches', { value: reducedMotion });
		}
		return result;
	});
	mounted.push(
		mount(BreathingExerciseSection, {
			target: document.body,
			props: {
				localDate: '2026-09-06',
				rounds: 1,
				includeHold: true,
				saveState: 'idle',
				interactive: false,
				oncomplete: () => {},
				onretry: () => {}
			}
		})
	);
	await tick();
	const outer = document.querySelector<HTMLElement>('[data-breathing-visual]');
	const inner = document.querySelector<HTMLElement>('[data-breathing-hold-progress]');
	if (!outer || !inner) throw new Error('Breathing spheres did not render');
	const resting: BreathingMotionOptions = { phase: 'inhale', seconds: 4, running: false };
	const outerMotion = breathingPhaseScale(outer, resting);
	const innerMotion = breathingHoldProgress(inner, resting);
	if (!outerMotion || !innerMotion) throw new Error('Missing motion lifecycle');
	cleanup.push(() => {
		outerMotion.destroy?.();
		innerMotion.destroy?.();
	});
	return {
		outer,
		inner,
		phase(phase: BreathingMotionOptions['phase'], running = true) {
			const options = {
				phase,
				running,
				seconds: phase === 'hold' ? 7 : phase === 'exhale' ? 8 : 4
			};
			outerMotion.update?.(options);
			innerMotion.update?.(options);
			finishMotion(outer);
			finishMotion(inner);
		}
	};
}

describe('breathing hold sphere', () => {
	for (const dark of [false, true]) {
		it(`uses dark text on the bright sphere in ${dark ? 'dark' : 'light'} mode`, async () => {
			document.documentElement.classList.toggle('dark', dark);
			const { outer } = await spheres();
			const label = document.querySelector('[aria-live="polite"]');
			if (!label) throw new Error('Missing phase label');
			expect(getComputedStyle(label).color).toBe('oklab(0 0 0 / 0.8)');
			expect(getComputedStyle(outer).color).toBe('oklab(0 0 0 / 0.8)');
		});
	}

	for (const reduced of [false, true]) {
		it(`matches the blue sphere at full hold and disappears on exhale (${reduced ? 'reduced' : 'animated'})`, async () => {
			const { outer, inner, phase } = await spheres(reduced);
			phase('inhale');
			expect(Number(gsap.getProperty(inner, 'scaleX'))).toBe(0);
			phase('hold');
			expect(inner.getBoundingClientRect().width).toBeCloseTo(
				outer.getBoundingClientRect().width,
				1
			);
			expect(inner.getBoundingClientRect().height).toBeCloseTo(
				outer.getBoundingClientRect().height,
				1
			);
			expect(Number(gsap.getProperty(inner, 'scaleX'))).toBe(1);
			phase('exhale');
			expect(Number(gsap.getProperty(inner, 'scaleX'))).toBe(0);
			expect(Number(gsap.getProperty(outer, 'scaleX'))).toBeCloseTo(0.42);
			phase('inhale', false);
			expect(Number(gsap.getProperty(inner, 'scaleX'))).toBe(0);
			expect(Number(gsap.getProperty(outer, 'scaleX'))).toBeCloseTo(0.42);
		});
	}

	it('keeps the inner sphere hidden when the hold phase is skipped', async () => {
		const { inner, phase } = await spheres();
		phase('inhale');
		phase('exhale');
		expect(Number(gsap.getProperty(inner, 'scaleX'))).toBe(0);
	});
});
