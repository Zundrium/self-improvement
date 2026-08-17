import { createAuth } from './auth';

export const auth = createAuth({
	DB: null as unknown as D1Database,
	APP_URL: 'http://localhost:3000',
	BETTER_AUTH_SECRET: 'development-only-change-me-minimum-32-characters'
});
