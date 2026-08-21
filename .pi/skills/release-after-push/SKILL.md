---
name: release-after-push
description: Publish the next signed Android pre-1.0 GitHub Release after project changes are committed and pushed. Use whenever the user asks to commit and push, memmit, push an existing commit, or make a release in this repository.
---

# Release After Push

## Rules

- Finish the requested commit and push flow before releasing. Complete the memmit workflow first when requested.
- Release only a clean `main` commit that exactly matches `origin/main`.
- Choose a unique `v0.MINOR.PATCH` tag without asking the user. Increment MINOR for user-facing capabilities or compatibility changes; increment PATCH for fixes, refactoring, documentation, and maintenance. Start at `v0.1.0` when no matching tag exists.
- Never move, replace, delete, or force-push a tag.
- Do not read signing secret values. Confirm only that all required secret names exist.
- Do not build the web, mobile, or Android app locally during this flow. GitHub Actions is the release build and validation environment.
- Do not watch, poll, or wait for the GitHub Actions run. End after reporting that the remote build has started.
- Stop on failed preflight or tag push. Never move or delete a pushed tag.

## Steps

1. Finish the commit or memmit flow and push the final commit.
2. Fetch remote state and tags:

```sh
git fetch origin main --tags
git status --short
test "$(git branch --show-current)" = main
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
test -z "$(git status --short)"
```

3. Confirm GitHub authentication and the five signing secret names:

```sh
gh auth status
configured_secrets="$(gh secret list --app actions | cut -f1)"
for secret in ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD ANDROID_CERT_SHA256; do
  printf '%s\n' "$configured_secrets" | grep -Fx "$secret" >/dev/null || exit 1
done
git tag --list 'v0.*.*' --sort=-version:refname | head -1
```

4. Choose the next version from the changes since the latest matching tag. Confirm it is absent locally and remotely:

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

7. Report the version, commit, and that the Android build is running on GitHub Actions. Include `run_url` when available, then end the flow without checking completion or release assets.
