import { json } from '@sveltejs/kit';
import { latestAndroidRelease } from '$lib/server/android-update';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, url }) => {
	const token = platform?.env.GITHUB_RELEASE_TOKEN?.trim();
	if (!token) return unavailable();
	try {
		const release = await latestAndroidRelease(token);
		return json(
			{
				tag_name: release.tag,
				apk_url: `${url.origin}/api/android-update/download`
			},
			{ headers: { 'cache-control': 'public, max-age=300' } }
		);
	} catch {
		console.error('Failed to read the latest Android release.');
		return unavailable();
	}
};

function unavailable() {
	return json(
		{ error: 'Android updates are temporarily unavailable.' },
		{ status: 503, headers: { 'cache-control': 'no-store' } }
	);
}
