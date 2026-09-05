import type { TrackerProgressDay } from '$lib/trackers/model';
import { dateDistance } from './date-navigation';

export type ChartPoint = TrackerProgressDay & {
	x: number;
	y: number;
	opacity: number;
	selected: number;
};
export type ChartTransition = { from: ChartPoint[]; to: ChartPoint[]; settled: ChartPoint[] };

export function chartPoints(days: TrackerProgressDay[], maxValue = 0): ChartPoint[] {
	const maximum = Math.max(maxValue, ...days.map(({ value }) => value ?? 0), 1);
	return days.map((day, index) => ({
		...day,
		x: 10 + index * 20,
		y: 46 - (Math.max(0, day.value ?? 0) / maximum) * 36,
		opacity: 1,
		selected: index === 2 ? 1 : 0
	}));
}

export function chartTransition(current: ChartPoint[], next: ChartPoint[]): ChartTransition {
	if (!current.length || !next.length) return { from: next, to: next, settled: next };
	const shared = next.find((point) => current.some(({ date }) => point.date === date));
	const anchor = current.find(({ date }) => date === shared?.date) ?? current[0];
	const destination = shared ?? next[0];
	const shift = destination.x - (anchor.x + dateDistance(anchor.date, destination.date) * 20);
	const travel = shared ? shift : Math.max(-100, Math.min(100, shift));
	const dates = [...new Set([...current, ...next].map(({ date }) => date))].sort();
	const from: ChartPoint[] = [];
	const to: ChartPoint[] = [];
	for (const date of dates) {
		const old = current.find((point) => point.date === date);
		const target = next.find((point) => point.date === date);
		if (old && target) {
			from.push(old);
			to.push(target);
		} else if (target) {
			from.push({ ...target, x: target.x - travel, opacity: 0 });
			to.push(target);
		} else if (old) {
			from.push(old);
			to.push({ ...old, x: old.x + travel, opacity: 0, selected: 0 });
		}
	}
	return { from, to, settled: next };
}

export function interpolateChart(transition: ChartTransition, progress: number): ChartPoint[] {
	return transition.to.map((target, index) => {
		const start = transition.from[index];
		const mix = (from: number, to: number) => from + (to - from) * progress;
		return {
			...target,
			x: mix(start.x, target.x),
			y: mix(start.y, target.y),
			opacity: mix(start.opacity, target.opacity),
			selected: mix(start.selected, target.selected)
		};
	});
}

export function chartSegments(points: ChartPoint[]) {
	return points.slice(1).flatMap((point, index) => {
		const previous = points[index];
		if (
			previous.value === null ||
			point.value === null ||
			dateDistance(previous.date, point.date) !== 1
		)
			return [];
		return [
			{
				key: previous.date,
				path: `M ${previous.x} ${previous.y} L ${point.x} ${point.y}`,
				opacity: Math.min(previous.opacity, point.opacity)
			}
		];
	});
}
