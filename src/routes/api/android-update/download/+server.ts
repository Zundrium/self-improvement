import { json } from '@sveltejs/kit';
import { latestApkDownloadLocation } from '$lib/server/android-update';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const token = platform?.env.GITHUB_RELEASE_TOKEN?.trim();
	if (!token) return unavailable();
	try {
		const location = await latestApkDownloadLocation(token);
		return new Response(null, {
			status: 302,
			headers: { location, 'cache-control': 'no-store' }
		});
	} catch {
		console.error('Failed to download the latest Android release.');
		return unavailable();
	}
};

function unavailable() {
	return json(
		{ error: 'Android updates are temporarily unavailable.' },
		{ status: 503, headers: { 'cache-control': 'no-store' } }
	);
}
