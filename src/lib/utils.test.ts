import { describe, expect, it } from 'vitest';
import { safeRedirect } from './utils';

describe('safeRedirect', () => {
	it('keeps internal destinations', () => {
		expect(safeRedirect('/profile?tab=password')).toBe('/profile?tab=password');
	});

	it.each(['https://example.com', '//example.com', '/api/auth/sign-out', null])(
		'rejects unsafe destination %s',
		(value) => {
			expect(safeRedirect(value, '/')).toBe('/');
		}
	);
});
