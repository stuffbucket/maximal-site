# maximal — landing site

Static Astro site published at `https://mxml.sh/` through GitHub Pages.

```sh
bun install
bun run dev      # http://localhost:4321
bun run build    # → dist/
bun run preview
```

The latest release version is fetched at **build time** from the GitHub
API. If no release exists yet, the page falls back to linking
`/releases`. To force a rebuild after cutting a tag, re-run the deploy
workflow.
