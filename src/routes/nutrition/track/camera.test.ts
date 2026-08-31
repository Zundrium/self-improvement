import { describe, expect, it } from 'vitest';
import { cameraVideoConstraints, createCameraStartup } from './camera';

describe('nutrition camera constraints', () => {
	it('uses the standard Android sensor request and lets the browser apply portrait orientation', () => {
		expect(cameraVideoConstraints('environment')).toEqual({
			facingMode: { ideal: 'environment' },
			width: { ideal: 1080 },
			height: { ideal: 720 },
			frameRate: { ideal: 30 }
		});
	});

	it('preserves front-camera selection', () => {
		expect(cameraVideoConstraints('user').facingMode).toEqual({ ideal: 'user' });
	});

	it('ignores an initial camera request when a newer start supersedes it', () => {
		const startup = createCameraStartup();
		const initialAttempt = startup.begin();
		const retryAttempt = startup.begin();

		expect(startup.isCurrent(initialAttempt)).toBe(false);
		expect(startup.isCurrent(retryAttempt)).toBe(true);
	});
});
