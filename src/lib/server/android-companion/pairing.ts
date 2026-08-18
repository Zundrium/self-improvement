import {
	createAndroidCompanionPairingPayload,
	normalizeAndroidCompanionApiBaseUrl
} from '$lib/android-companion/pairing';
import type { Database } from '$lib/server/db';
import { screenTimeConnection } from '$lib/server/db/trackers/screen-time';
import { sleepConnection } from '$lib/server/db/trackers/sleep';
import { stepConnection } from '$lib/server/db/trackers/steps';
import {
	createScreenTimeToken,
	hashScreenTimeToken
} from '../../../routes/(trackers)/screen-time/server/screen-time';
import { createSleepToken, hashSleepToken } from '../../../routes/(trackers)/sleep/server/sleep';
import { createStepToken, hashStepToken } from '../../../routes/(trackers)/steps/server/steps';

const INITIAL_TIME_ZONE = 'UTC';

type TrackerCredentials = {
	steps: string;
	sleep: string;
	screenTime: string;
};

export async function rotateAndroidCompanionCredentials(
	db: Database,
	userId: string,
	requestedApiBaseUrl: string
) {
	const apiBaseUrl = normalizeAndroidCompanionApiBaseUrl(requestedApiBaseUrl);
	const tokens = createTrackerTokens();
	const tokenHashes = await hashTrackerTokens(tokens);
	const payload = pairingPayload(apiBaseUrl, tokens);
	await rotateTrackerCredentials(db, userId, tokenHashes);
	return payload;
}

function pairingPayload(apiBaseUrl: string, tokens: TrackerCredentials) {
	return createAndroidCompanionPairingPayload({
		apiBaseUrl,
		timeZone: INITIAL_TIME_ZONE,
		tokens
	});
}

function createTrackerTokens(): TrackerCredentials {
	return {
		steps: createStepToken(),
		sleep: createSleepToken(),
		screenTime: createScreenTimeToken()
	};
}

async function hashTrackerTokens(tokens: TrackerCredentials): Promise<TrackerCredentials> {
	const [steps, sleep, screenTime] = await Promise.all([
		hashStepToken(tokens.steps),
		hashSleepToken(tokens.sleep),
		hashScreenTimeToken(tokens.screenTime)
	]);
	return { steps, sleep, screenTime };
}

async function rotateTrackerCredentials(
	db: Database,
	userId: string,
	tokenHashes: TrackerCredentials
) {
	const updatedAt = new Date();
	await db.batch([
		stepCompanionUpsert(db, userId, tokenHashes.steps, updatedAt),
		sleepCompanionUpsert(db, userId, tokenHashes.sleep, updatedAt),
		screenTimeCompanionUpsert(db, userId, tokenHashes.screenTime, updatedAt)
	]);
}

function stepCompanionUpsert(
	db: Database,
	userId: string,
	companionTokenHash: string,
	updatedAt: Date
) {
	return db
		.insert(stepConnection)
		.values(newConnection(userId, companionTokenHash))
		.onConflictDoUpdate({
			target: stepConnection.userId,
			set: rotatedConnection(companionTokenHash, updatedAt)
		});
}

function sleepCompanionUpsert(
	db: Database,
	userId: string,
	companionTokenHash: string,
	updatedAt: Date
) {
	return db
		.insert(sleepConnection)
		.values(newConnection(userId, companionTokenHash))
		.onConflictDoUpdate({
			target: sleepConnection.userId,
			set: rotatedConnection(companionTokenHash, updatedAt)
		});
}

function screenTimeCompanionUpsert(
	db: Database,
	userId: string,
	companionTokenHash: string,
	updatedAt: Date
) {
	return db
		.insert(screenTimeConnection)
		.values(newConnection(userId, companionTokenHash))
		.onConflictDoUpdate({
			target: screenTimeConnection.userId,
			set: rotatedConnection(companionTokenHash, updatedAt)
		});
}

function newConnection(userId: string, companionTokenHash: string) {
	return {
		userId,
		tokenHash: createInaccessibleLegacyTokenHash(),
		companionTokenHash,
		companionTimeZone: INITIAL_TIME_ZONE,
		timeZone: INITIAL_TIME_ZONE
	};
}

function rotatedConnection(companionTokenHash: string, updatedAt: Date) {
	return { companionTokenHash, companionTimeZone: INITIAL_TIME_ZONE, updatedAt };
}

function createInaccessibleLegacyTokenHash() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
