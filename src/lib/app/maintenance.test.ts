import { describe, expect, it } from 'vitest';
import { MaintenanceGate, MaintenanceInProgressError } from './maintenance';

describe('restore maintenance', () => {
	it('drains an in-flight native collection before restore and refuses new work', async () => {
		const gate = new MaintenanceGate();
		const order: string[] = [];
		let finish!: () => void;
		const collection = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const sync = gate.run(async () => {
			await collection;
			order.push('native-write');
		});
		const restore = gate.exclusive(async () => {
			order.push('restore');
		});
		await expect(gate.run(async () => undefined)).rejects.toBeInstanceOf(
			MaintenanceInProgressError
		);
		expect(order).toEqual([]);
		finish();
		await Promise.all([sync, restore]);
		expect(order).toEqual(['native-write', 'restore']);
		await gate.run(async () => {
			order.push('new-work');
		});
		expect(order.at(-1)).toBe('new-work');
	});

	it('reopens operations after a failed restore without retrying it', async () => {
		const gate = new MaintenanceGate();
		await expect(
			gate.exclusive(async () => {
				throw new Error('disk');
			})
		).rejects.toThrow('disk');
		await expect(gate.run(async () => 'recovered')).resolves.toBe('recovered');
	});
});
