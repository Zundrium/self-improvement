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

	it('dismisses a toast after its duration', () => {
		vi.useFakeTimers();
		toast.success('Saved', { duration: 100 });

		vi.advanceTimersByTime(100);
		expect(get(toastStore)[0]?.closing).toBe(true);
		vi.runAllTimers();

		expect(get(toastStore)).toEqual([]);
	});
});
