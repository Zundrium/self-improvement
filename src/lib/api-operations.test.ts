import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const execute = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('$lib/app/action-candidates', () => ({ appActionCandidates: [] }));
vi.mock('$native/secure-repository', () => ({ DatabaseMobileRepository: class {} }));
vi.mock('$lib/local/service', () => ({
	LocalAppService: class {
		execute = execute;
	},
	LocalServiceError: class extends Error {}
}));
import { GAMIFICATION_CHANGED_EVENT, localOperation, recordAchievementEvents } from './api';

describe('typed local operation refresh events', () => {
	let changed: ReturnType<typeof vi.fn<() => void>>;
	beforeEach(() => {
		execute.mockClear();
		vi.stubGlobal('window', new EventTarget());
		changed = vi.fn();
		window.addEventListener(GAMIFICATION_CHANGED_EVENT, changed);
	});
	afterEach(() => vi.unstubAllGlobals());

	it('refreshes shared views after a committed nutrition edit without navigation', async () => {
		await localOperation('updateNutritionEntry', {
			entryId: 'entry',
			entry: { date: '2026-03-20', time: '12:00', timeZoneOffset: 0, meals: [] }
		});
		expect(changed).toHaveBeenCalledOnce();
	});

	it('does not publish mutations for reads or rejected writes', async () => {
		await localOperation('gamification', undefined);
		execute.mockRejectedValueOnce(new Error('Write failed'));
		await expect(localOperation('deleteNutritionEntry', { entryId: 'entry' })).rejects.toThrow(
			'Write failed'
		);
		expect(changed).not.toHaveBeenCalled();
	});

	it('publishes an achievement mutation only once', async () => {
		await recordAchievementEvents('event-first-backup');
		expect(changed).toHaveBeenCalledOnce();
	});
});
