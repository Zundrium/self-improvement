export function submittedSnapshot<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function draftKey(value: unknown) {
	return JSON.stringify(value);
}

export function sameDraft(left: unknown, right: unknown) {
	return draftKey(left) === draftKey(right);
}
