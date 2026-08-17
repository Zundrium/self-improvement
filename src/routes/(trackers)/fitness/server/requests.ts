import { error } from '@sveltejs/kit';

export function assertSameOrigin(request: Request, url: URL) {
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) error(403, 'Cross-origin request rejected.');
}

export function readPositiveId(value: string) {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id < 1) error(400, 'Invalid id.');
	return id;
}

export async function readJson(request: Request) {
	return request.json().catch(() => error(400, 'Expected a JSON body.'));
}
