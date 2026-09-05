import { describe, expect, it } from 'vitest';
import { consumeRoutineTick, pausedRoutineTick } from './engine';

describe('routine timing engine', () => {
	it('crosses one phase boundary after a delayed tick', () => {
		expect(consumeRoutineTick(500, 2_000)).toEqual({ remainingMs: 0, shouldAdvance: true });
	});
	it('does not consume paused background time', () => {
		expect(pausedRoutineTick(500)).toEqual({ remainingMs: 500, shouldAdvance: false });
	});
});
