import { CapacitorHttp } from '@capacitor/core';
import type { FetchAdapter } from '../domain/uploader';
import { requireNativeAndroid } from './platform';

const REQUEST_TIMEOUT_MS = 30_000;

export const capacitorRequest: FetchAdapter = async (input, init) => {
	requireNativeAndroid();
	const response = await CapacitorHttp.request({
		url: requestUrl(input),
		method: init?.method ?? 'GET',
		headers: requestHeaders(init?.headers),
		data: requestBody(init?.body),
		connectTimeout: REQUEST_TIMEOUT_MS,
		readTimeout: REQUEST_TIMEOUT_MS,
		disableRedirects: true,
		responseType: 'text'
	});
	return new Response(null, { status: response.status });
};

function requestUrl(input: RequestInfo | URL) {
	if (typeof input === 'string') return input;
	return input instanceof URL ? input.toString() : input.url;
}

function requestHeaders(headers?: HeadersInit) {
	if (!headers) return {};
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return headers;
}

function requestBody(body?: BodyInit | null) {
	if (body === undefined || body === null || typeof body === 'string') return body;
	throw new TypeError('Expected a string request body.');
}
