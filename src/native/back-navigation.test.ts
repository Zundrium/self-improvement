import { describe, expect, it, vi } from 'vitest';
import { backAction } from './back-navigation';

describe('Android back policy', () => {
	it('dismisses an open overlay before consuming navigation history', () => {
		const dismiss = vi.fn(() => true);
		expect(backAction(true, dismiss)).toBe('dismissed');
		expect(dismiss).toHaveBeenCalledOnce();
	});
	it('uses history for workflows and exits only at the history root', () => {
		expect(backAction(true, () => false)).toBe('history');
		expect(backAction(false, () => false)).toBe('exit');
	});
});
