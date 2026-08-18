/// <reference types="@cloudflare/workers-types" />

import type { AppAuth, AuthSession, AuthUser, RuntimeEnv } from '$lib/server/auth';
import type { Database } from '$lib/server/db';

type PlatformEnvironment = RuntimeEnv & {
	ASSETS: Fetcher;
	OPENROUTER_API_KEY?: string;
};

declare global {
	namespace App {
		interface Platform {
			env: PlatformEnvironment;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			auth?: AppAuth;
			db?: Database;
			session: AuthSession;
			user: AuthUser | null;
		}

		interface PageData {
			user?: AuthUser | null;
		}
	}
}

export {};
