import { z } from 'zod';

const GITHUB_API = 'https://api.github.com/repos/Zundrium/self-improvement';
const RELEASE_ASSET_NAME = (tag: string) => `self-improvement-${tag}.apk`;

const releaseSchema = z.object({
	tag_name: z.string().min(1),
	assets: z.array(
		z.object({
			id: z.number().int().positive(),
			name: z.string()
		})
	)
});

export type AndroidRelease = {
	tag: string;
	assetId: number;
};

export async function latestAndroidRelease(
	token: string,
	request: typeof fetch = fetch
): Promise<AndroidRelease> {
	const response = await request(`${GITHUB_API}/releases/latest`, githubRequest(token));
	if (!response.ok) throw new AndroidUpdateError('GitHub release request failed.');
	const release = releaseSchema.parse(await response.json());
	const asset = release.assets.find(({ name }) => name === RELEASE_ASSET_NAME(release.tag_name));
	if (!asset) throw new AndroidUpdateError('The latest release has no APK.');
	return { tag: release.tag_name, assetId: asset.id };
}

export async function latestApkDownloadLocation(
	token: string,
	request: typeof fetch = fetch
): Promise<string> {
	const release = await latestAndroidRelease(token, request);
	const response = await request(
		`${GITHUB_API}/releases/assets/${release.assetId}`,
		githubRequest(token, 'application/octet-stream')
	);
	const location = response.headers.get('location');
	if (!location || !isTrustedAssetLocation(location)) {
		throw new AndroidUpdateError('GitHub returned no APK.');
	}
	return location;
}

function githubRequest(token: string, accept = 'application/vnd.github+json'): RequestInit {
	return {
		headers: {
			Accept: accept,
			Authorization: `Bearer ${token}`,
			'User-Agent': 'self-improvement-update-service',
			'X-GitHub-Api-Version': '2022-11-28'
		},
		redirect: 'manual'
	};
}

function isTrustedAssetLocation(location: string) {
	try {
		const url = new URL(location);
		return url.protocol === 'https:' && url.hostname.endsWith('.githubusercontent.com');
	} catch {
		return false;
	}
}

export class AndroidUpdateError extends Error {}
