---
name: feature-development
description: Develop and release Self Improvement changes with subagents, self-review, local user acceptance, memmit, deployment, and a signed Android release. Use for feature work and its approval-to-release flow in this repository.
---

# Feature Development and Release

## Rules

- Use at least one worker subagent to implement each feature. Split independent work across subagents when useful.
- Keep commits, pushes, deployments, releases, and long-running processes under the main agent's control.
- Review the integrated changes yourself. Do not delegate the final review.
- Keep changes uncommitted until the user approves the local result.
- Do not use `npm run build` to validate the feature during implementation or user acceptance. GitHub Actions builds the signed Android release.
- Treat approval of the presented local result as authorization to stop the app, memmit, deploy affected production services, and publish the Android release.
- Release only a clean `main` commit that exactly matches `origin/main`.
- Never move, replace, delete, or force-push a tag.
- Do not read signing secret values. Confirm only that the required secret names exist.
- Do not watch, poll, or wait for GitHub Actions after the release starts.

## Develop and Approve

1. Read the request, repository instructions, and relevant code.
2. Give worker subagents clear, separate implementation tasks. Tell them not to commit, push, deploy, release, or start persistent processes.
3. Integrate their work. Inspect the complete diff, review behavior and edge cases, and make any needed corrections yourself.
4. Run targeted checks while iterating, then run `npm run check`, `npm run lint`, and `npm run test` before presenting the result.
5. Start both the API and mobile app from the repository root:

```sh
run_dir=/tmp/self-improvement-dev
mkdir -p "$run_dir"
setsid npm run dev >"$run_dir/output.log" 2>&1 </dev/null &
printf '%s\n' "$!" >"$run_dir/pid"
```

6. Confirm from the log that the servers are ready. Give the user the local URLs, ask them to take a look, and wait for feedback or approval. Keep the server running while addressing feedback, then repeat the review and relevant checks.
7. After approval, stop the complete local process group and remove its temporary files:

```sh
run_dir=/tmp/self-improvement-dev
pid="$(cat "$run_dir/pid")"
kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
rm -rf "$run_dir"
```

## Memmit and Deploy

1. Follow the memmit skill to commit, push, and publish memory for the approved changes.
2. Follow the deploy skill for each affected non-Android production target. The user's local approval is the required deployment approval.
3. Stop on a failed commit, push, memory publication, or production deployment.

## Release Android

1. Fetch remote state and tags, then verify the release commit:

```sh
git fetch origin main --tags
git status --short
test "$(git branch --show-current)" = main
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
test -z "$(git status --short)"
```

2. Confirm GitHub authentication and the five signing secret names:

```sh
gh auth status
configured_secrets="$(gh secret list --app actions | cut -f1)"
for secret in ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD ANDROID_CERT_SHA256; do
  printf '%s\n' "$configured_secrets" | grep -Fx "$secret" >/dev/null || exit 1
done
git tag --list 'v0.*.*' --sort=-version:refname | head -1
```

3. Choose a unique `v0.MINOR.PATCH` version without asking. Increment MINOR for user-facing capabilities or compatibility changes. Increment PATCH for fixes, refactoring, documentation, and maintenance. Start at `v0.1.0` when no matching tag exists.
4. Confirm the chosen version is absent locally and remotely:

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

6. Query the tag-triggered workflow once without waiting:

```sh
run_url="$(gh run list --workflow android.yml --branch "$version" --event push --limit 1 --json url --jq '.[0].url')"
```

7. Report the commit, deployment status, release version, and that the Android build is running. Include `run_url` when available, then end without checking completion or release assets.
