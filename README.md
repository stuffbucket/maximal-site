# maximal — website

> **This repository is only the website.** The maximal app, its releases,
> and its issues live at **[stuffbucket/maximal](https://github.com/stuffbucket/maximal)**.
> If you'd like to star the project, star it there.

Static Astro site. Its content is published at **https://mxml.sh**; this
repository's own GitHub Pages site,
`https://stuffbucket.github.io/maximal-site/`, is a preview of `main` that
points its canonical links at mxml.sh and asks not to be indexed.

```sh
pnpm install
pnpm run dev      # http://localhost:4321/maximal-site/
pnpm run build    # cached by Turbo → dist/
pnpm run test     # cached by Turbo
pnpm run check    # build + test
pnpm run preview
```

`SITE_URL` and `SITE_BASE` choose where a build is served from. They default
to the preview; `SITE_URL=https://mxml.sh SITE_BASE=/ pnpm run build` builds
for mxml.sh.

## How mxml.sh is published

mxml.sh stays stuffbucket/maximal's Pages site, because maximal's release
pipeline produces the endpoints installed apps and apt rely on. Its deploy
builds a tagged version of this repository through
`.github/workflows/build-mxml.yml` and adds what maximal owns on top:

- `CNAME`;
- `/updates/*`, read by installed apps' update checks;
- `/apt/*`, the signed apt repository;
- `/maximal/`, the redirect for old app builds.

maximal decides when mxml.sh updates, and tags here decide what it shows.
Merging to `main` only updates the preview. A maximal deploy builds the newest
tag here whose version is at or below the stable version it is publishing:

- **Content for a release:** tag `v0.5.3` whenever it's ready. It goes live
  when maximal 0.5.3 becomes stable. Release candidates don't change the
  content.
- **A fix to the live content:** move the tag to the fix, then run maximal's
  *Deploy Pages* workflow. That redeploys mxml.sh without an app release:

  ```sh
  git tag -f v0.5.2 <fix-commit> && git push -f origin v0.5.2
  gh workflow run deploy-pages.yml -R stuffbucket/maximal
  ```

  Name the commit: if `main` already holds content for the next release,
  build the fix on a branch from `v0.5.2`, tag that, and merge it to `main`
  too. A fourth component (`v0.5.2.1`) also works when the earlier tag should
  stay as it was. The `publishing-mxml-content` skill in `.claude/skills/`
  walks through each case.
- **No tag at or below the stable version** fails the deploy, and mxml.sh stays
  as it was.

The download buttons and version pills are baked from maximal's
`site/public/updates/manifest.json` at build time, then refreshed in the
browser from `https://mxml.sh/updates/manifest.json`. The copy committed here
only feeds the preview.
