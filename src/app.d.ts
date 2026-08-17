/// <reference types="@cloudflare/workers-types" />

import type { AppAuth, AuthSession, AuthUser } from '$lib/server/auth';
import type { Database } from '$lib/server/db';

declare global {
	namespace App {
		interface Platform {
			env: Env;
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
