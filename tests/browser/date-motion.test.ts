import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, tick, unmount } from 'svelte';
import { gsap } from 'gsap';
import DateMotionHarness from './DateMotionHarness.svelte';
import '../../src/routes/global.css';

const mounted: ReturnType<typeof mount>[] = [];
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function render(mode: 'line' | 'check' = 'line') {
	const component = mount(DateMotionHarness, { target: document.body, props: { mode } });
	mounted.push(component);
	return component;
}

function chartDay(date: string) {
	const element = document.querySelector<HTMLElement>(`[data-chart-date="${date}"]`);
	if (!element) throw new Error(`Missing chart date: ${date}`);
	return element;
}

function calories() {
	return document.querySelector('[aria-label="Calories"] [data-animated-value] [aria-hidden]')
		?.textContent;
}

afterEach(async () => {
	for (const component of mounted.splice(0)) await unmount(component);
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('in-place date motion in Chromium', () => {
	it('fades stationary sections while moving yesterday right and counting metrics', async () => {
		const component = render();
		await tick();
		await pause(950);
		const main = document.querySelector('main');
		const progress = document.querySelector('[aria-label="Calories"]');
		if (!progress) throw new Error('Missing circular progress section');
		const progressLeft = progress.getBoundingClientRect().x;
		const input = document.querySelector('input');
		if (!input) throw new Error('Missing input');
		input.value = 'Keep my state';
		input.focus();
		const today = chartDay('2026-09-05');
		const before = today.getBoundingClientRect().x;
		component.select('2026-09-04');
		await tick();
		await pause(100);
		expect(document.querySelector('main')).toBe(main);
		expect(document.querySelector('input')).toBe(input);
		expect(input.value).toBe('Keep my state');
		expect(document.activeElement).toBe(input);
		expect(chartDay('2026-09-05')).toBe(today);
		expect(today.getBoundingClientRect().x).toBeGreaterThan(before);
		const value = Number(calories()?.replaceAll(',', ''));
		expect(value).toBeGreaterThan(1000);
		expect(value).toBeLessThan(2000);
		for (const label of ['Summary', 'Historical state']) {
			const section = document.querySelector(`[aria-label="${label}"]`);
			if (!section) throw new Error(`Missing ${label} section`);
			expect(Number(getComputedStyle(section).opacity)).toBeLessThan(1);
			expect(getComputedStyle(section).transform).toBe('none');
		}
		expect(progress.getBoundingClientRect().x).toBeCloseTo(progressLeft, 3);
		await expect.poll(calories).toBe('1,000');
		expect(progress.getBoundingClientRect().x).toBeCloseTo(progressLeft, 3);
		await expect.poll(() => document.querySelectorAll('[data-chart-date]').length).toBe(5);
		const yesterdayPosition = today.getBoundingClientRect().x;
		component.select('2026-09-05');
		await pause(100);
		expect(today.getBoundingClientRect().x).toBeLessThan(yesterdayPosition);
		expect(progress.getBoundingClientRect().x).toBeCloseTo(progressLeft, 3);
		await expect.poll(calories).toBe('2,000');
		expect(progress.getBoundingClientRect().x).toBeCloseTo(progressLeft, 3);
	});

	it('settles rapid direction reversals and calendar jumps on only the requested dates', async () => {
		const component = render();
		await tick();
		for (const date of ['2026-09-04', '2026-09-03', '2026-09-04', '2026-08-01']) {
			component.select(date);
			await tick();
			await pause(40);
		}
		await expect.poll(() => document.querySelectorAll('[data-chart-date]').length).toBe(5);
		expect(
			[...document.querySelectorAll<HTMLElement>('[data-chart-date]')].map(
				(element) => element.dataset.chartDate
			)
		).toEqual(['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02', '2026-08-03']);
		expect(calories()).toBe('1,000');
		expect(document.querySelectorAll('path[d^="M "]')).toHaveLength(4);
	});

	it('slides completion cells with the same date identity as line charts', async () => {
		const component = render('check');
		await tick();
		const completed = chartDay('2026-09-04');
		const before = completed.getBoundingClientRect().x;
		component.select('2026-09-04');
		await pause(100);
		expect(chartDay('2026-09-04')).toBe(completed);
		expect(completed.getBoundingClientRect().x).toBeGreaterThan(before);
		expect(completed.querySelector('svg')).not.toBeNull();
	});

	it('finishes active motion immediately when reduced motion changes and cleans up on unmount', async () => {
		const original = window.matchMedia.bind(window);
		const preference = new EventTarget() as MediaQueryList;
		let reduced = false;
		Object.defineProperty(preference, 'matches', { get: () => reduced });
		vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
			query === '(prefers-reduced-motion: reduce)' ? preference : original(query)
		);
		const component = render();
		await tick();
		component.select('2026-09-04');
		await pause(80);
		reduced = true;
		preference.dispatchEvent(new Event('change'));
		await tick();
		expect(calories()).toBe('1,000');
		expect(document.querySelectorAll('[data-chart-date]')).toHaveLength(5);
		component.select('2026-09-05');
		await tick();
		expect(calories()).toBe('2,000');
		expect(document.querySelectorAll('[data-chart-date]')).toHaveLength(5);
		const mountedComponent = mounted.pop();
		if (!mountedComponent) throw new Error('Missing mounted component');
		await unmount(mountedComponent);
		expect(gsap.globalTimeline.getChildren().filter((tween) => tween.isActive())).toHaveLength(0);
	});
});
