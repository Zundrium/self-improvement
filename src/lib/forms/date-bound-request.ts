export type DateBoundRequest = {
	date: string;
	revision: number;
	sequence: number;
};

export class DateBoundRequestLifetime {
	private date: string;
	private revision = 0;
	private sequence = 0;
	private activeSequence = 0;
	private disposed = false;

	constructor(date: string) {
		this.date = date;
	}

	syncDate(date: string) {
		if (this.date === date) return false;
		this.date = date;
		this.revision += 1;
		this.activeSequence = 0;
		return true;
	}

	begin(date = this.date): DateBoundRequest {
		const sequence = ++this.sequence;
		this.activeSequence = sequence;
		return { date, revision: this.revision, sequence };
	}

	isCurrent(request: DateBoundRequest, currentDate: string) {
		return (
			!this.disposed &&
			this.date === currentDate &&
			this.date === request.date &&
			this.revision === request.revision &&
			this.activeSequence === request.sequence
		);
	}

	dispose() {
		this.disposed = true;
		this.revision += 1;
		this.activeSequence = 0;
	}
}
