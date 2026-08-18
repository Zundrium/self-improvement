import { z } from 'zod';

export const ANDROID_COMPANION_PAIRING_VERSION = 1 as const;

export const androidCompanionApiBaseUrlSchema = z
	.string()
	.max(2_048)
	.transform(parseApiUrl)
	.refine(hasAllowedUrlParts, 'API base URL must be an origin without credentials or URL parts.')
	.refine(hasAllowedProtocol, 'API base URL must use HTTPS outside a local network.')
	.transform(({ url }) => url.origin);

export const androidCompanionTimeZoneSchema = z
	.string()
	.min(1)
	.max(100)
	.refine(isIanaTimeZone, 'Time zone must be a valid IANA time zone.');

const androidCompanionTokensSchema = z
	.object({
		steps: z.string().regex(/^stp_[0-9a-f]{64}$/),
		sleep: z.string().regex(/^slp_[0-9a-f]{64}$/),
		screenTime: z.string().regex(/^scr_[0-9a-f]{64}$/)
	})
	.strict();

export const androidCompanionPairingPayloadSchema = z
	.object({
		version: z.literal(ANDROID_COMPANION_PAIRING_VERSION),
		apiBaseUrl: androidCompanionApiBaseUrlSchema,
		timeZone: androidCompanionTimeZoneSchema,
		tokens: androidCompanionTokensSchema
	})
	.strict();

export type AndroidCompanionPairingPayload = z.infer<typeof androidCompanionPairingPayloadSchema>;

export function createAndroidCompanionPairingPayload(
	input: Omit<AndroidCompanionPairingPayload, 'version'>
) {
	return androidCompanionPairingPayloadSchema.parse({
		version: ANDROID_COMPANION_PAIRING_VERSION,
		...input
	});
}

export function normalizeAndroidCompanionApiBaseUrl(value: string) {
	return androidCompanionApiBaseUrlSchema.parse(value);
}

export function serializeAndroidCompanionPairingPayload(payload: unknown) {
	return JSON.stringify(androidCompanionPairingPayloadSchema.parse(payload));
}

export function parseAndroidCompanionPairingPayload(serialized: string) {
	const json = z.string().max(4_096).parse(serialized);
	return androidCompanionPairingPayloadSchema.parse(JSON.parse(json) as unknown);
}

function parseApiUrl(value: string, context: z.RefinementCtx) {
	try {
		return { value, url: new URL(value) };
	} catch {
		context.addIssue({ code: 'custom', message: 'API base URL must be a valid URL.' });
		return z.NEVER;
	}
}

function hasAllowedUrlParts({ value, url }: { value: string; url: URL }) {
	const originOnly = /^[a-z][a-z\d+.-]*:\/\/[^/?#]+\/?$/i.test(value);
	return originOnly && !url.username && !url.password && url.pathname === '/';
}

function hasAllowedProtocol({ url }: { url: URL }) {
	if (url.protocol === 'https:') return true;
	return url.protocol === 'http:' && isLocalHttpHost(url.hostname);
}

function isLocalHttpHost(hostname: string) {
	const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
	return (
		host === 'localhost' ||
		host.endsWith('.localhost') ||
		host === '10.0.2.2' ||
		isPrivateIpv4(host) ||
		isPrivateIpv6(host)
	);
}

function isPrivateIpv4(hostname: string) {
	const octets = hostname.split('.').map(Number);
	if (
		octets.length !== 4 ||
		octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
	) {
		return false;
	}
	const [first, second] = octets;
	return (
		first === 10 ||
		first === 127 ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	);
}

function isPrivateIpv6(hostname: string) {
	return hostname === '::1' || /^(?:fc|fd|fe[89ab])[0-9a-f]*:/i.test(hostname);
}

function isIanaTimeZone(value: string) {
	try {
		new Intl.DateTimeFormat('en', { timeZone: value }).format();
		return true;
	} catch {
		return false;
	}
}
