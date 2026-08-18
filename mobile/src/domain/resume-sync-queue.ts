export class ResumeSyncQueue {
	private pending = false;

	enqueue() {
		this.pending = true;
	}

	dequeue() {
		if (!this.pending) return false;
		this.pending = false;
		return true;
	}
}
