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
builds this repository's `main` through `.github/workflows/build-mxml.yml` and
adds what maximal owns on top:

- `CNAME`;
- `/updates/*`, read by installed apps' update checks;
- `/apt/*`, the signed apt repository;
- `/maximal/`, the redirect for old app builds.

maximal decides when mxml.sh updates; merging here only updates the preview.
A maximal deploy builds whatever is on `main` at that moment:

- **A maximal release** redeploys with the current `main`.
- **An editorial update** goes live when someone runs maximal's *Deploy Pages*
  workflow by hand (`gh workflow run deploy-pages.yml -R stuffbucket/maximal`).

The download buttons and version pills are baked from maximal's
`site/public/updates/manifest.json` at build time, then refreshed in the
browser from `https://mxml.sh/updates/manifest.json`. The copy committed here
only feeds the preview.
