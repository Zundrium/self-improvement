const TECHNICAL_DETAIL =
	/\b(capacitor|sqlite|sql|database|plugin|native|schema|table|transaction|connection|constraint|pragma)\b/i;
const SENSITIVE_VALUE =
	/\b(api[_ -]?key|authorization|bearer|password|secret|token)\s*[:=]\s*[^\s,;]+/gi;
const URL_CREDENTIALS = /\b([a-z][a-z\d+.-]*:\/\/)[^\s/@]+@/gi;
const MAX_DETAIL_LENGTH = 240;

export function initializationErrorMessage(cause: unknown) {
	const detail = technicalDetails(cause)[0];
	const prefix = 'App initialization failed while opening local storage.';
	return detail
		? `${prefix} Technical detail: ${detail}`
		: `${prefix} No safe technical detail was provided.`;
}

function technicalDetails(cause: unknown) {
	const details: string[] = [];
	const visited = new Set<object>();
	collectDetails(cause, details, visited);
	const technical = details.filter((detail) => TECHNICAL_DETAIL.test(detail)).map(sanitizeDetail);
	return technical.toSorted((left, right) => detailPriority(right) - detailPriority(left));
}

function detailPriority(detail: string) {
	return /\b(capacitor|sqlite)\b/i.test(detail) ? 1 : 0;
}

function collectDetails(value: unknown, details: string[], visited: Set<object>) {
	if (!value || typeof value !== 'object' || visited.has(value)) return;
	visited.add(value);
	if (value instanceof Error) {
		details.push(value.message);
		collectDetails(value.cause, details, visited);
		return;
	}
	const record = value as Record<string, unknown>;
	if (typeof record.message === 'string') details.push(record.message);
	for (const key of ['cause', 'error', 'details']) collectDetails(record[key], details, visited);
}

function sanitizeDetail(detail: string) {
	return detail
		.replace(URL_CREDENTIALS, '$1[redacted]@')
		.replace(SENSITIVE_VALUE, '$1=[redacted]')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, MAX_DETAIL_LENGTH);
}
