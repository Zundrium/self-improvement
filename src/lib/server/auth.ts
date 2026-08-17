import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { createDb } from './db';
import { schema } from './db/schema';
import { sendEmail } from './email';

export type RuntimeEnv = {
	DB: D1Database;
	APP_URL?: string;
	BETTER_AUTH_URL?: string;
	BETTER_AUTH_SECRET?: string;
	BETTER_AUTH_TRUSTED_ORIGINS?: string;
	EMAIL_FROM?: string;
	RESEND_API_KEY?: string;
};

export function createAuth(env: RuntimeEnv, origin = 'http://localhost:3000') {
	const appUrl = resolveAppUrl(env, origin);
	return betterAuth({
		secret:
			readString(env.BETTER_AUTH_SECRET) || 'development-only-change-me-minimum-32-characters',
		baseURL: appUrl,
		basePath: '/api/auth',
		trustedOrigins: buildTrustedOrigins(env, appUrl, origin),
		database: drizzleAdapter(createDb(env.DB), { provider: 'sqlite', schema }),
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			minPasswordLength: 8,
			revokeSessionsOnPasswordReset: true,
			sendResetPassword: ({ user, url }) => sendPasswordReset(env, user.email, url)
		},
		user: { additionalFields: adminFields },
		plugins: [admin({ defaultRole: 'user', adminRoles: ['admin'] })]
	});
}

export type AppAuth = ReturnType<typeof createAuth>;
export type AuthSession = Awaited<ReturnType<AppAuth['api']['getSession']>>;
export type AuthUser = NonNullable<AuthSession>['user'];

const adminFields = {
	role: { type: 'string', required: false, defaultValue: 'user', input: false },
	banned: { type: 'boolean', required: false, defaultValue: false, input: false },
	banReason: { type: 'string', required: false, input: false },
	banExpires: { type: 'date', required: false, input: false }
} as const;

async function sendPasswordReset(env: RuntimeEnv, email: string, url: string) {
	await sendEmail(env, {
		to: email,
		subject: 'Reset your password',
		text: `Reset your password: ${url}`,
		html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`
	});
}

function resolveAppUrl(env: RuntimeEnv, origin: string) {
	const requestOrigin = toOrigin(origin) || 'http://localhost:3000';
	if (isLoopbackOrigin(requestOrigin)) return requestOrigin;
	return readString(env.BETTER_AUTH_URL) || readString(env.APP_URL) || requestOrigin;
}

function buildTrustedOrigins(env: RuntimeEnv, appUrl: string, origin: string) {
	return [...new Set([toOrigin(appUrl), toOrigin(origin), ...readOrigins(env)].filter(Boolean))];
}

function readOrigins(env: RuntimeEnv) {
	return readString(env.BETTER_AUTH_TRUSTED_ORIGINS).split(',').map(toOrigin).filter(Boolean);
}

function toOrigin(value: string) {
	try {
		return new URL(value.trim()).origin;
	} catch {
		return '';
	}
}

function isLoopbackOrigin(origin: string) {
	const hostname = new URL(origin).hostname;
	return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

function readString(value: unknown) {
	return typeof value === 'string' ? value : '';
}
