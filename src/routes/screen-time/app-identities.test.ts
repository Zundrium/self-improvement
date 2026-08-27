import { describe, expect, it } from 'vitest';
import { addScreenTimeAppIdentities } from './app-identities';

describe('screen-time app identities', () => {
	it('adds resolved labels and icons without changing usage', () => {
		const apps = [
			{
				package: 'com.example.browser',
				name: 'com.example.browser',
				minutes: 42,
				last_used: '2025-11-02T18:00:00.000Z'
			}
		];

		expect(
			addScreenTimeAppIdentities(apps, {
				'com.example.browser': {
					label: 'Browser',
					icon: 'data:image/png;base64,icon'
				}
			})
		).toEqual([{ ...apps[0], name: 'Browser', icon: 'data:image/png;base64,icon' }]);
	});

	it('keeps collected details when no identity is resolved', () => {
		const apps = [{ package: 'com.example.unknown', name: 'Unknown', tracked: false }];

		expect(addScreenTimeAppIdentities(apps, {})).toEqual([{ ...apps[0], icon: undefined }]);
	});
});
