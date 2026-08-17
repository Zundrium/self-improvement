#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashPassword } from 'better-auth/crypto';
import { input, password as passwordPrompt } from '@inquirer/prompts';

const usage = `Create or promote a Better Auth admin user in Cloudflare D1.

Usage:
  npm run admin:create:local
  npm run admin:create -- --email admin@example.com --password 'strong-password' [--name 'Admin'] [--remote]
  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='strong-password' npm run admin:create -- [--remote]

Options:
  --email <email>        Admin email address (or ADMIN_EMAIL)
  --password <password>  Admin password, minimum 8 chars (or ADMIN_PASSWORD)
  --name <name>          Display name for new users (or ADMIN_NAME)
  --remote               Use the remote D1 database
  --local                Use the local D1 database (default)
  --database <name>      D1 database name (defaults to wrangler.jsonc database_name)
  --help                 Show this help
`;

function parseArgs(argv) {
	const args = {
		email: process.env.ADMIN_EMAIL,
		password: process.env.ADMIN_PASSWORD,
		name: process.env.ADMIN_NAME,
		remote: false,
		local: false,
		database: process.env.D1_DATABASE
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--help' || arg === '-h') {
			args.help = true;
		} else if (arg === '--remote') {
			args.remote = true;
		} else if (arg === '--local') {
			args.local = true;
		} else if (arg === '--email') {
			args.email = argv[++index];
		} else if (arg?.startsWith('--email=')) {
			args.email = arg.slice('--email='.length);
		} else if (arg === '--password') {
			args.password = argv[++index];
		} else if (arg?.startsWith('--password=')) {
			args.password = arg.slice('--password='.length);
		} else if (arg === '--name') {
			args.name = argv[++index];
		} else if (arg?.startsWith('--name=')) {
			args.name = arg.slice('--name='.length);
		} else if (arg === '--database') {
			args.database = argv[++index];
		} else if (arg?.startsWith('--database=')) {
			args.database = arg.slice('--database='.length);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}

	return args;
}

function readDatabaseName() {
	try {
		const config = readFileSync('wrangler.jsonc', 'utf8');
		const match = config.match(/"database_name"\s*:\s*"([^"]+)"/);
		return match?.[1];
	} catch {
		return undefined;
	}
}

function sqlString(value) {
	if (value == null) return 'NULL';
	return `'${String(value).replaceAll("'", "''")}'`;
}

function userNameFromEmail(email) {
	const local = email.split('@')[0] || 'Admin';
	return (
		local
			.split(/[._-]+/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ') || 'Admin'
	);
}

async function promptForCredentials(args) {
	if (!process.stdin.isTTY) return;
	args.email ||= await input({ message: 'Admin email:' });
	args.password ||= await passwordPrompt({ message: 'Admin password:', mask: true });
}

function runWrangler(args) {
	const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
	const result = spawnSync(executable, ['wrangler', ...args], { stdio: 'inherit', shell: false });
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`wrangler exited with status ${result.status}`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) return process.stdout.write(usage);
	if (args.remote && args.local) throw new Error('Use either --local or --remote, not both.');
	await promptForCredentials(args);

	const email = args.email?.trim().toLowerCase();
	const password = args.password;
	const nameWasProvided = Boolean(args.name?.trim());
	const name = nameWasProvided ? args.name.trim() : userNameFromEmail(email ?? '');
	const database = args.database ?? readDatabaseName() ?? 'self-improvement-db';
	const target = args.remote ? '--remote' : '--local';

	if (!email || !email.includes('@')) {
		throw new Error('A valid --email or ADMIN_EMAIL is required.');
	}
	if (!password || password.length < 8) {
		throw new Error('A --password or ADMIN_PASSWORD with at least 8 characters is required.');
	}

	const now = Date.now();
	const userId = randomUUID();
	const accountId = randomUUID();
	const passwordHash = await hashPassword(password);

	const sql = `INSERT INTO "user" (
  "id", "name", "email", "email_verified", "created_at", "updated_at", "role", "banned"
) VALUES (
  ${sqlString(userId)}, ${sqlString(name)}, ${sqlString(email)}, 1, ${now}, ${now}, 'admin', 0
)
ON CONFLICT("email") DO UPDATE SET
  "name" = CASE WHEN ${nameWasProvided ? 1 : 0} = 1 THEN excluded."name" ELSE "user"."name" END,
  "email_verified" = 1,
  "updated_at" = excluded."updated_at",
  "role" = 'admin',
  "banned" = 0,
  "ban_reason" = NULL,
  "ban_expires" = NULL;

UPDATE "account"
SET "password" = ${sqlString(passwordHash)}, "updated_at" = ${now}
WHERE "user_id" = (SELECT "id" FROM "user" WHERE "email" = ${sqlString(email)})
  AND "provider_id" = 'credential';

INSERT INTO "account" (
  "id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at"
)
SELECT ${sqlString(accountId)}, "id", 'credential', "id", ${sqlString(passwordHash)}, ${now}, ${now}
FROM "user"
WHERE "email" = ${sqlString(email)}
  AND NOT EXISTS (
    SELECT 1 FROM "account"
    WHERE "user_id" = "user"."id" AND "provider_id" = 'credential'
  );

`;

	const dir = mkdtempSync(join(tmpdir(), 'self-improvement-admin-'));
	const file = join(dir, 'create-admin.sql');

	try {
		if (target === '--local') runWrangler(['d1', 'migrations', 'apply', database, target]);
		writeFileSync(file, sql, { mode: 0o600 });
		runWrangler(['d1', 'execute', database, target, '--file', file]);
		console.log(
			`Admin user ready: ${email} (${target === '--remote' ? 'remote' : 'local'} ${database})`
		);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	console.error('\n' + usage);
	process.exit(1);
});
