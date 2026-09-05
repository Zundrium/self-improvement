import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { mount, tick, unmount } from 'svelte';
import type { AudioManager } from '$lib/audio/audio-manager';
import GuidedRoutineRunner from '$lib/components/routines/GuidedRoutineRunner.svelte';
import { loadPausedSession, savePausedSession } from '$lib/routines/session';
import '../../src/routes/global.css';

const SESSION_ID = 'browser-lifecycle-regression';
const SESSION_KEY = `guided-routine:${SESSION_ID}`;
const mounted: ReturnType<typeof mount>[] = [];

afterEach(async () => {
	for (const component of mounted.splice(0)) await unmount(component);
	sessionStorage.removeItem(SESSION_KEY);
	document.body.innerHTML = '';
});

describe('guided routine lifecycle in Chromium', () => {
	it('recovers paused, resumes, and safely destroys with async setup pending', async () => {
		savePausedSession(SESSION_KEY, {
			phase: 'activity',
			position: { setIndex: 0, activityIndex: 0, activityRepeatIndex: 0 },
			timeLeftMs: 5_000,
			totalTimeMs: 10_000,
			activityCadences: {},
			activityImageVariants: {}
		});

		const preload = deferred<void>();
		const wakeLock = deferred<WakeLockSentinel>();
		const release = vi.fn(async () => undefined);
		const stopAll = vi.fn();
		const audioManager = {
			preload: vi.fn(() => preload.promise),
			play: vi.fn(async () => true),
			stopAll
		} as unknown as AudioManager;
		const originalWakeLock = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
		Object.defineProperty(navigator, 'wakeLock', {
			configurable: true,
			value: { request: vi.fn(() => wakeLock.promise) }
		});

		try {
			const component = mount(GuidedRoutineRunner, {
				target: document.body,
				props: {
					activities: [
						{
							id: 'one',
							name: 'First activity',
							imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
							type: 'timed',
							durationSeconds: 10
						}
					],
					audioManager,
					setCount: 1,
					restBetweenActivitiesSeconds: 1,
					restBetweenSetsSeconds: 1,
					sounds: {
						tick: 'tick.mp3',
						start: 'start.mp3',
						complete: 'complete.mp3',
						intro: 'intro.mp3',
						beep: 'beep.mp3'
					},
					oncomplete: vi.fn(),
					oncancel: vi.fn(),
					sessionIdentity: SESSION_ID
				}
			});
			mounted.push(component);
			await tick();

			await expect.element(page.getByRole('button', { name: 'Resume' })).toBeVisible();
			await expect.element(page.getByText('0:05')).toBeVisible();
			await page.getByRole('button', { name: 'Resume' }).click();
			await expect.element(page.getByRole('button', { name: 'Pause' })).toBeVisible();

			await unmount(component);
			mounted.pop();
			expect(stopAll).toHaveBeenCalledOnce();
			expect(loadPausedSession(SESSION_KEY)).toMatchObject({ phase: 'activity' });

			wakeLock.resolve({ release, addEventListener: vi.fn() });
			preload.resolve();
			await tick();
			expect(release).toHaveBeenCalledOnce();
		} finally {
			if (originalWakeLock) Object.defineProperty(navigator, 'wakeLock', originalWakeLock);
			else Reflect.deleteProperty(navigator, 'wakeLock');
		}
	});
});

type WakeLockSentinel = {
	release(): Promise<void>;
	addEventListener(type: 'release', listener: () => void): void;
};

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((complete) => (resolve = complete));
	return { promise, resolve };
}
