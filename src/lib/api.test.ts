import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppBootstrapData } from './api-types';
import { apiRequest } from './api';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('apiRequest', () => {
	it('resolves endpoint-compatible data without HTTP or credentials', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);

		const app = await apiRequest<AppBootstrapData>('/api/app/bootstrap');

		expect(app.profile.id).toBe('local-profile');
		expect(app.enabledTrackers).toHaveLength(10);
		expect(fetch).not.toHaveBeenCalled();
	});
});
