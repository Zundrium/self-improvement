import { describe, expect, it } from 'vitest';
import { cameraVideoConstraints } from './camera';

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
});
