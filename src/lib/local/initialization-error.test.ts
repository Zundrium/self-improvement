import { describe, expect, it } from 'vitest';
import { initializationErrorMessage } from './initialization-error';

describe('initializationErrorMessage', () => {
	it('includes a nested Capacitor SQLite failure detail', () => {
		const cause = new Error('Database initialization failed', {
			cause: {
				details: {
					message: 'CapacitorSQLite: SQLite error near "CREATE": syntax error'
				}
			}
		});

		expect(initializationErrorMessage(cause)).toBe(
			'App initialization failed while opening local storage. Technical detail: CapacitorSQLite: SQLite error near "CREATE": syntax error'
		);
	});

	it('redacts credential-like values from technical details', () => {
		const cause = {
			message:
				'Database connection failed: token=private-value api_key=another-private-value https://user:password@example.test'
		};

		const message = initializationErrorMessage(cause);

		expect(message).toContain('Database connection failed');
		expect(message).toContain('token=[redacted]');
		expect(message).toContain('api_key=[redacted]');
		expect(message).toContain('https://[redacted]@example.test');
		expect(message).not.toContain('private-value');
		expect(message).not.toContain('another-private-value');
		expect(message).not.toContain('user:password');
	});

	it('includes primitive plugin rejections', () => {
		expect(initializationErrorMessage('CreateConnection: Connection local-v2 already exists')).toBe(
			'App initialization failed while opening local storage. Technical detail: CreateConnection: Connection local-v2 already exists'
		);
	});

	it('recognizes Android SQLiteDatabase query errors', () => {
		expect(
			initializationErrorMessage(
				new Error('Queries can be performed using SQLiteDatabase query or rawQuery methods only.')
			)
		).toContain('Technical detail: Queries can be performed using SQLiteDatabase');
	});

	it('does not expose unrelated error messages', () => {
		expect(initializationErrorMessage(new Error('Profile name: Taylor'))).toBe(
			'App initialization failed while opening local storage. No safe technical detail was provided.'
		);
	});
});
