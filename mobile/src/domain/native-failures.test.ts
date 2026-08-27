import { describe, expect, it } from 'vitest';
import { healthProviderFailure, usageProviderFailure } from './native-failures';

describe('native provider failure classification', () => {
	it('treats transient Health Connect failures as retryable native failures', () => {
		expect(healthProviderFailure(new Error('Health Connect provider disconnected'))).toMatchObject({
			category: 'native',
			retryable: true
		});
	});

	it('retains Health Connect permission failures', () => {
		expect(healthProviderFailure(new Error('Permission denied for steps'))).toMatchObject({
			category: 'permission',
			retryable: true
		});
	});

	it('recognizes the exact UsageStats permission rejection', () => {
		expect(usageProviderFailure(new Error('Not allowed to query usage stats'))).toMatchObject({
			category: 'permission',
			retryable: true
		});
	});

	it('does not mistake other UsageStats access errors for permission rejection', () => {
		expect(usageProviderFailure(new Error('Database access failed'))).toMatchObject({
			category: 'native',
			retryable: true
		});
	});
});
