import { describe, expect, it } from 'vitest';
import { cameraVideoConstraints, createCameraStartup, decodeGalleryImage } from './camera';

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

	it('falls back to an image element when the bitmap decoder rejects a gallery file', async () => {
		const decodeBitmap = () => Promise.reject(new DOMException('The source image could not be decoded'));
		const decodeImageElement = () => Promise.resolve('decoded');

		await expect(decodeGalleryImage(decodeBitmap, decodeImageElement)).resolves.toBe('decoded');
	});

	it('uses the image element decoder when createImageBitmap is unavailable', async () => {
		const decodeImageElement = () => Promise.resolve('decoded');

		await expect(decodeGalleryImage(undefined, decodeImageElement)).resolves.toBe('decoded');
	});
});
