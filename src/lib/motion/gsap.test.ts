import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	set: vi.fn(),
	to: vi.fn()
}));

vi.mock('gsap', () => ({ gsap: mocks }));

import { linearProgress, spin } from './gsap';

describe('GSAP actions', () => {
	beforeEach(() => {
		mocks.to.mockReturnValue({ kill: vi.fn() });
		vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: false })) });
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	it('starts and cleans up its own spinner tween', () => {
		const node = {} as HTMLElement;
		const action = spin(node);
		const tween = mocks.to.mock.results[0]?.value as { kill: ReturnType<typeof vi.fn> };

		expect(mocks.to).toHaveBeenCalledWith(node, {
			rotation: 360,
			duration: 0.85,
			ease: 'none',
			repeat: -1
		});

		action?.destroy?.();
		expect(tween.kill).toHaveBeenCalledOnce();
		expect(mocks.set).toHaveBeenCalledWith(node, { clearProps: 'transform' });
	});

	it('does not animate when reduced motion is requested', () => {
		vi.stubGlobal('window', { matchMedia: vi.fn(() => ({ matches: true })) });

		spin({} as HTMLElement);

		expect(mocks.to).not.toHaveBeenCalled();
	});

	it('initializes linear progress through the same GSAP transform property it animates', () => {
		const node = {} as HTMLElement;

		linearProgress(node, { value: 50 });

		expect(mocks.set).toHaveBeenCalledWith(node, { xPercent: -100 });
		expect(mocks.to).toHaveBeenCalledWith(node, {
			xPercent: -50,
			duration: 0.8,
			ease: 'power3.out',
			overwrite: true
		});
	});
});
