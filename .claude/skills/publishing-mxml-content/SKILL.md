---
name: publishing-mxml-content
description: Use when changing what mxml.sh shows (landing page, install guide), fixing a mistake on the live site, preparing site content for an upcoming maximal release, tagging maximal-site, or checking which content is live on mxml.sh.
---

# Publishing mxml.sh content

mxml.sh is deployed by **stuffbucket/maximal**. This repo only supplies its pages. Merging to `main` updates the preview (stuffbucket.github.io/maximal-site), never mxml.sh. **A tag decides what mxml.sh shows. A maximal deploy decides when it changes.**

Each maximal deploy runs `.github/workflows/build-mxml.yml` from this repo, pinned to a commit in maximal's `deploy-pages.yml`. That workflow builds the newest tag `vX.Y.Z[.N]` at or below the **stable** version in maximal's `site/public/updates/manifest.json`. Release candidates never change the stable version.

## Choose the flow

| Goal | Do this |
|---|---|
| Content for an upcoming release (e.g. 0.5.3) | Merge to `main`, then tag that merge `v0.5.3`. If more lands before release day, move the tag. It goes live when maximal's stable manifest moves to 0.5.3; nobody needs to act that day. |
| Fix what's live now (stable 0.5.2), and `main` has nothing unreleased | Merge the fix, `git tag -f v0.5.2 <merge-sha>` (always name the commit), `git push -f origin v0.5.2`, then run `gh workflow run deploy-pages.yml -R stuffbucket/maximal --ref main`. |
| Fix what's live, but `main` already holds unreleased content | Branch from the **live tag** (`git switch -c fix-x v0.5.2`), fix, move `v0.5.2` to that commit, run maximal's deploy, then merge the fix to `main` too. Never move a live tag to `main` here; that publishes the unreleased content. |
| See what's live | Open the latest maximal *Deploy Pages* run. The `content` job logs `Stable is X; building maximal-site vY`. |

Find the live tag first: read `channels.stable.version` from https://mxml.sh/updates/manifest.json, then `git ls-remote --tags origin`.

## Where things live

- Guide: `docs/guide/*.md`. Landing copy: `src/content/landing/index.mdoc`.
- maximal owns `CNAME`, `/updates/*`, `/apt/*` and `/maximal/`. Don't add them here; its deploy replaces them anyway.
- maximal's `site/src` is only the legacy rollback. Never edit pages there.
- **Changes to `build-mxml.yml` follow maximal's pin, not tags.** They reach mxml.sh only after a maximal PR moves the pin in `deploy-pages.yml` (`build-mxml.yml@<sha> # vX.Y.Z`). Check them with the mxml.sh build below first.

## Verify

1. Locally: `SITE_URL=https://mxml.sh SITE_BASE=/ pnpm build` must pass `verify-dist`. Use `rm -rf dist` first: Turbo can restore stale files into an existing `dist/`.
2. After the deploy: `curl -s https://mxml.sh/<path>/ | grep -F '<new text>'`. Pages caches for up to 10 minutes. Also confirm `https://mxml.sh/updates/manifest.json` and `https://mxml.sh/apt/dists/stable/InRelease` still return 200.

## Common mistakes

- Thinking a merge to `main` publishes. It only changes the preview.
- Moving the live tag to `main` while `main` holds unreleased content.
- Tagging a branch commit that never reaches `main`. The next release's content then loses the fix, so merge it to `main` as well.
- Expecting an rc to show new content. Only the stable version picks the tag.
- No tag at or below the stable version: maximal's deploy fails and mxml.sh stays as it was. Tag, then rerun the deploy.

## Keep this current

Update this skill, README "How mxml.sh is published", and maximal's `docs/release-runbook.md` → **mxml.sh pages** together whenever any of these change:
- how `build-mxml.yml` picks tags;
- the `SITE_URL`/`SITE_BASE` contract;
- what maximal adds on top of the pages.
