import { describe, expect, it } from 'vitest';
import {
	ANDROID_COMPANION_PAIRING_VERSION,
	androidCompanionPairingPayloadSchema,
	normalizeAndroidCompanionApiBaseUrl,
	parseAndroidCompanionPairingPayload,
	serializeAndroidCompanionPairingPayload
} from './pairing';

const tokens = {
	steps: `stp_${'a'.repeat(64)}`,
	sleep: `slp_${'b'.repeat(64)}`,
	screenTime: `scr_${'c'.repeat(64)}`
};

const validPayload = {
	version: ANDROID_COMPANION_PAIRING_VERSION,
	apiBaseUrl: 'https://example.com',
	timeZone: 'Europe/Amsterdam',
	tokens
};

describe('Android companion pairing origins', () => {
	it('normalizes secure API origins', () => {
		expect(normalizeAndroidCompanionApiBaseUrl('HTTPS://EXAMPLE.COM:443/')).toBe(
			'https://example.com'
		);
		expect(normalizeAndroidCompanionApiBaseUrl('https://example.com:8443')).toBe(
			'https://example.com:8443'
		);
	});

	it.each([
		'http://localhost:3000',
		'http://device.localhost:3000',
		'http://127.0.0.1:3000',
		'http://10.0.2.2:3000',
		'http://10.1.2.3:3000',
		'http://172.16.0.1:3000',
		'http://172.31.255.254:3000',
		'http://192.168.1.20:3000',
		'http://[::1]:3000',
		'http://[fd12::1]:3000'
	])('allows local HTTP origin %s', (origin) => {
		expect(normalizeAndroidCompanionApiBaseUrl(origin)).toBe(new URL(origin).origin);
	});

	it.each([
		'http://example.com',
		'http://8.8.8.8',
		'http://172.32.0.1',
		'ftp://localhost',
		'not a URL',
		'https://user:secret@example.com',
		'https://example.com/api',
		'https://example.com/.',
		'https://example.com?device=android',
		'https://example.com#pairing'
	])('rejects unsafe or non-origin API URL %s', (origin) => {
		expect(() => normalizeAndroidCompanionApiBaseUrl(origin)).toThrow();
	});
});

describe('Android companion pairing payloads', () => {
	it('accepts version one with an IANA time zone and three prefixed tokens', () => {
		expect(androidCompanionPairingPayloadSchema.parse(validPayload)).toEqual(validPayload);
	});

	it('rejects unknown versions and keys', () => {
		expect(() =>
			androidCompanionPairingPayloadSchema.parse({ ...validPayload, version: 2 })
		).toThrow();
		expect(() =>
			androidCompanionPairingPayloadSchema.parse({ ...validPayload, unexpected: true })
		).toThrow();
		expect(() =>
			androidCompanionPairingPayloadSchema.parse({
				...validPayload,
				tokens: { ...tokens, fitness: `fit_${'d'.repeat(64)}` }
			})
		).toThrow();
	});

	it('rejects missing, swapped, or malformed token prefixes', () => {
		const missingSleep = { steps: tokens.steps, screenTime: tokens.screenTime };
		expect(() =>
			androidCompanionPairingPayloadSchema.parse({ ...validPayload, tokens: missingSleep })
		).toThrow();
		expect(() =>
			androidCompanionPairingPayloadSchema.parse({
				...validPayload,
				tokens: { ...tokens, steps: tokens.sleep }
			})
		).toThrow();
		expect(() =>
			androidCompanionPairingPayloadSchema.parse({
				...validPayload,
				tokens: { ...tokens, screenTime: 'scr_not-a-token' }
			})
		).toThrow();
	});

	it('rejects non-IANA time zones', () => {
		expect(() =>
			androidCompanionPairingPayloadSchema.parse({ ...validPayload, timeZone: 'GMT plus two' })
		).toThrow();
	});

	it('serializes a normalized payload and parses it losslessly', () => {
		const serialized = serializeAndroidCompanionPairingPayload({
			...validPayload,
			apiBaseUrl: 'HTTPS://EXAMPLE.COM:443/'
		});
		expect(parseAndroidCompanionPairingPayload(serialized)).toEqual(validPayload);
	});

	it('rejects malformed serialized payloads', () => {
		expect(() => parseAndroidCompanionPairingPayload('{')).toThrow();
		expect(() =>
			parseAndroidCompanionPairingPayload(JSON.stringify({ ...validPayload, version: 99 }))
		).toThrow();
	});
});
