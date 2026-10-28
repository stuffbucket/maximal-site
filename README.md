# maximal — website

> **This repository is only the website.** The maximal app, its releases,
> and its issues live at **[stuffbucket/maximal](https://github.com/stuffbucket/maximal)**.
> If you'd like to star the project, star it there.

Static Astro site published at
`https://stuffbucket.github.io/maximal-site/` through GitHub Pages.

```sh
pnpm install
pnpm run dev      # http://localhost:4321/maximal-site/
pnpm run build    # cached by Turbo → dist/
pnpm run test     # cached by Turbo
pnpm run check    # build + test
pnpm run preview
```

The latest release version is fetched at **build time** from the GitHub
API. If no release exists yet, the page falls back to linking
`/releases`. To force a rebuild after cutting a tag, re-run the deploy
workflow.
