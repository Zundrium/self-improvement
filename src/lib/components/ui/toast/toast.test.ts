import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast, toastStore } from './toast';

afterEach(() => {
	toast.dismiss();
	vi.useRealTimers();
});

describe('toast', () => {
	it('replaces a toast with the same id', () => {
		toast.success('Saved', { id: 'settings' });
		toast.error('Failed', { id: 'settings' });

		expect(get(toastStore)).toMatchObject([{ id: 'settings', message: 'Failed', type: 'error' }]);
	});

	it('supports gamification notification types', () => {
		toast.achievement('Achievement unlocked');
		toast.streak('Streak increased');
		toast.glimmer('Glimmers added');

		expect(get(toastStore).map(({ type }) => type)).toEqual([
			'achievement',
			'streak',
			'glimmer'
		]);
	});

	it('dismisses a toast after ten seconds by default', () => {
		vi.useFakeTimers();
		toast.success('Saved');

		vi.advanceTimersByTime(9_999);
		expect(get(toastStore)[0]?.closing).toBe(false);
		vi.advanceTimersByTime(1);
		expect(get(toastStore)[0]?.closing).toBe(true);
		vi.runAllTimers();

		expect(get(toastStore)).toEqual([]);
	});

	it('supports a custom duration', () => {
		vi.useFakeTimers();
		toast.success('Saved', { duration: 100 });

		vi.advanceTimersByTime(100);
		expect(get(toastStore)[0]?.closing).toBe(true);
	});
});
