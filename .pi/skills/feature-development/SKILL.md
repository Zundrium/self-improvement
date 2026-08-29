---
name: feature-development
description: Develop and release Self Improvement Android features with locally stored data, local review, approval, memmit, and a signed GitHub release.
---

# Feature Development and Release

## Project boundary

- Work on the single root SvelteKit/Svelte 5 app and its Capacitor Android project under `android/`.
- Keep application state in Dexie and native tracker processing on-device.
- Preserve manual nutrition, JSON export/restore, optional daily Google Drive SAF backups, and the five-file backup maximum.
- Do not add accounts, a backend, web deployment, analytics, ads, AI nutrition, or custom network requests beyond the public GitHub release updater.
- Keep Android permissions limited to Internet and package installation for signed GitHub updates, notifications, Usage Access, read-only Steps, wake lock, and boot-completed support for reminders.

## Rules

- Use worker subagents for independent implementation tasks when available. Do not delegate final review.
- Keep commits, pushes, tags, and releases under the main agent's control.
- Keep changes uncommitted until the user approves the local result.
- Do not run `npm run build` during implementation or local acceptance. GitHub Actions performs release builds.
- Never start a persistent process when the user forbids it.
- Treat approval of the presented local result as authorization to stop local processes, memmit, and publish the next signed Android release.
- Release only a clean `main` commit that exactly matches `origin/main`.
- Never move, replace, delete, or force-push a tag.
- Do not read signing secret values. Confirm only that required secret names exist.
- Do not watch, poll, or wait for GitHub Actions after a release starts.

## Develop and approve

1. Read the request, repository instructions, and relevant code.
2. Give available worker subagents separate tasks and forbid commits, pushes, tags, releases, and persistent processes.
3. Integrate the work and inspect the complete diff, local data behavior, backup safety, updater security, and merged-permission implications.
4. Run targeted checks, then `npm run check`, `npm run lint`, and `npm run test`.
5. When local acceptance needs a browser preview and persistent processes are allowed, start the app from the repository root:

```sh
run_dir=/tmp/self-improvement-dev
mkdir -p "$run_dir"
setsid npm run dev >"$run_dir/output.log" 2>&1 </dev/null &
printf '%s\n' "$!" >"$run_dir/pid"
```

6. Confirm `http://localhost:5173` is ready, ask the user to review it, and wait for approval.
7. After approval, stop the process group and remove its temporary files:

```sh
run_dir=/tmp/self-improvement-dev
pid="$(cat "$run_dir/pid")"
kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
rm -rf "$run_dir"
```

## Memmit

Follow the memmit skill to commit, push, and publish memory for the approved changes. There is no web or backend deployment target.

## Release Android

1. Fetch remote state and verify the release commit:

```sh
git fetch origin main --tags
git status --short
test "$(git branch --show-current)" = main
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
test -z "$(git status --short)"
```

2. Confirm GitHub authentication and signing secret names:

```sh
gh auth status
configured_secrets="$(gh secret list --app actions | cut -f1)"
for secret in ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD ANDROID_CERT_SHA256; do
  printf '%s\n' "$configured_secrets" | grep -Fx "$secret" >/dev/null || exit 1
done
git tag --list 'v0.*.*' --sort=-version:refname | head -1
```

3. Choose a unique `v0.MINOR.PATCH`: increment MINOR for user-facing capabilities or compatibility changes and PATCH for fixes, refactoring, documentation, and maintenance.
4. Confirm the tag is absent locally and remotely:

```sh
version=v0.MINOR.PATCH
test -z "$(git tag --list "$version")"
! git ls-remote --exit-code --tags origin "refs/tags/$version"
```

5. Create and push an annotated tag:

```sh
git tag -a "$version" -m "Release $version"
git push origin "refs/tags/$version"
```

6. Query the tag workflow once without waiting:

```sh
run_url="$(gh run list --workflow android.yml --branch "$version" --event push --limit 1 --json url --jq '.[0].url')"
```

7. Report the release commit, version, and workflow URL, then stop without checking completion or release assets.
