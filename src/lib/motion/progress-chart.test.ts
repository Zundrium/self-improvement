import { describe, expect, it } from 'vitest';
import { trackerProgressDays } from '$lib/trackers/progress';
import { chartPoints, chartSegments, chartTransition, interpolateChart } from './progress-chart';

const points = (date: string) =>
	chartPoints(
		trackerProgressDays(date, '2026-10-01', () => 10),
		100
	);

describe('persistent five-day chart transitions', () => {
	it('moves shared dates right for yesterday and left for tomorrow', () => {
		for (const [date, shift] of [
			['2026-09-04', 20],
			['2026-09-06', -20]
		] as const) {
			const transition = chartTransition(points('2026-09-05'), points(date));
			const index = transition.from.findIndex(({ date }) => date === '2026-09-05');
			expect(transition.to[index].x - transition.from[index].x).toBe(shift);
		}
	});

	it('retargets rapid navigation from the currently displayed coordinates', () => {
		const partial = interpolateChart(
			chartTransition(points('2026-09-05'), points('2026-09-04')),
			0.4
		);
		const next = chartTransition(partial, points('2026-09-03'));
		for (const point of partial)
			expect(next.from.find(({ date }) => date === point.date)).toEqual(point);
		const entering = next.from.find(({ date }) => date === '2026-09-01');
		const adjacent = next.from.find(({ date }) => date === '2026-09-02');
		if (!entering || !adjacent) throw new Error('Expected entering and adjacent dates');
		expect(adjacent.x - entering.x).toBeCloseTo(20);
		expect(interpolateChart(next, 1).filter(({ opacity }) => opacity === 1)).toEqual(next.settled);
	});

	it('anchors a reversal during a calendar jump to shared visible dates', () => {
		const partial = interpolateChart(
			chartTransition(points('2026-09-05'), points('2026-08-01')),
			0.5
		);
		const reversal = chartTransition(partial, points('2026-09-04'));
		const entering = reversal.from.find(({ date }) => date === '2026-09-02');
		const adjacent = reversal.from.find(({ date }) => date === '2026-09-03');
		if (!entering || !adjacent) throw new Error('Expected adjacent dates');
		expect(adjacent.x - entering.x).toBeCloseTo(20);
	});

	it('bounds calendar jumps instead of flying through every skipped day', () => {
		const transition = chartTransition(points('2026-09-05'), points('2026-08-01'));
		for (let index = 0; index < transition.from.length; index++) {
			expect(Math.abs(transition.to[index].x - transition.from[index].x)).toBeLessThanOrEqual(100);
		}
	});

	it('keeps missing days and disjoint date windows disconnected', () => {
		const data = points('2026-09-05');
		data[2].value = null;
		expect(chartSegments(data)).toHaveLength(2);
		const transition = chartTransition(data, points('2026-08-01'));
		expect(chartSegments(transition.from)).toHaveLength(6);
	});

	it('interpolates rescaled values and retains zero as a plotted point', () => {
		const start = chartPoints([{ date: '2026-09-05', value: 0 }], 100);
		const end = chartPoints([{ date: '2026-09-05', value: 200 }], 100);
		const middle = interpolateChart(chartTransition(start, end), 0.5)[0];
		expect(start[0].y).toBe(46);
		expect(middle.y).toBe(28);
		expect(end[0].y).toBe(10);
	});
});
