export async function mapWithConcurrency<Input, Output>(
	items: readonly Input[],
	concurrency: number,
	mapper: (item: Input, index: number) => Promise<Output>
): Promise<Output[]> {
	if (!Number.isInteger(concurrency) || concurrency < 1) {
		throw new RangeError('Concurrency must be a positive integer.');
	}
	const results = new Array<Output>(items.length);
	let nextIndex = 0;
	let failure: unknown;
	let hasFailure = false;

	async function worker() {
		while (!hasFailure && nextIndex < items.length) {
			const index = nextIndex++;
			try {
				results[index] = await mapper(items[index], index);
			} catch (cause) {
				if (!hasFailure) {
					hasFailure = true;
					failure = cause;
				}
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(items.length, concurrency) }, () => worker()));
	if (hasFailure) throw failure;
	return results;
}
