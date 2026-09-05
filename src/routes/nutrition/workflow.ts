export const NUTRITION_REQUEST_TIMEOUT_MS = 30_000;

export class RequestLifetime {
	private generation = 0;
	private controller?: AbortController;

	begin(timeoutMs = NUTRITION_REQUEST_TIMEOUT_MS) {
		this.cancel();
		const id = ++this.generation;
		const controller = new AbortController();
		this.controller = controller;
		const timeout = setTimeout(
			() => controller.abort(new Error('The request timed out.')),
			timeoutMs
		);
		return { id, signal: controller.signal, finish: () => clearTimeout(timeout) };
	}

	isCurrent(id: number) {
		return id === this.generation;
	}

	cancel() {
		this.generation += 1;
		this.controller?.abort();
		this.controller = undefined;
	}
}

export function requestError(cause: unknown, fallback: string) {
	if (cause instanceof DOMException && cause.name === 'AbortError')
		return 'The request was cancelled.';
	return cause instanceof Error ? cause.message : fallback;
}

export function withAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
	if (signal.aborted) return Promise.reject(signal.reason);
	return new Promise<T>((resolve, reject) => {
		const abort = () => reject(signal.reason);
		signal.addEventListener('abort', abort, { once: true });
		operation.then(
			(value) => {
				signal.removeEventListener('abort', abort);
				resolve(value);
			},
			(cause) => {
				signal.removeEventListener('abort', abort);
				reject(cause);
			}
		);
	});
}
