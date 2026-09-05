export class MaintenanceInProgressError extends Error {
	constructor() {
		super('A backup is being restored. Wait for it to finish, then try again.');
	}
}

/** App operations enter before collecting data, so restore can drain their complete lifetime. */
export class MaintenanceGate {
	private operations = new Set<Promise<unknown>>();
	private restoring = false;

	run<T>(operation: () => Promise<T>): Promise<T> {
		if (this.restoring) return Promise.reject(new MaintenanceInProgressError());
		const pending = Promise.resolve().then(operation);
		this.operations.add(pending);
		void pending.then(
			() => this.operations.delete(pending),
			() => this.operations.delete(pending)
		);
		return pending;
	}

	async exclusive<T>(operation: () => Promise<T>): Promise<T> {
		if (this.restoring) throw new MaintenanceInProgressError();
		this.restoring = true;
		try {
			await Promise.allSettled([...this.operations]);
			return await operation();
		} finally {
			this.restoring = false;
		}
	}
}

export const appMaintenance = new MaintenanceGate();
