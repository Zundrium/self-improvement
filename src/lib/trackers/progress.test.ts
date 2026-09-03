import { describe, expect, it } from 'vitest';
import { trackerProgressDays } from './progress';

describe('tracker progress days', () => {
	it('centers five days on the selected date and leaves future values empty', () => {
		expect(
			trackerProgressDays('2026-03-20', '2026-03-20', (date) => Number(date.slice(-2)))
		).toEqual([
			{ date: '2026-03-18', value: 18 },
			{ date: '2026-03-19', value: 19 },
			{ date: '2026-03-20', value: 20 },
			{ date: '2026-03-21', value: null },
			{ date: '2026-03-22', value: null }
		]);
	});

	it('keeps both following days when viewing a past date', () => {
		expect(trackerProgressDays('2026-03-18', '2026-03-20', () => 1)).toEqual([
			{ date: '2026-03-16', value: 1 },
			{ date: '2026-03-17', value: 1 },
			{ date: '2026-03-18', value: 1 },
			{ date: '2026-03-19', value: 1 },
			{ date: '2026-03-20', value: 1 }
		]);
	});
});
