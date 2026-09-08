// @ts-check
import markdoc from "@astrojs/markdoc";
import { defineConfig } from "astro/config";

const base = "/maximal-site";

// Rewrite the guide docs' repo-relative links (./slug or ./slug.md, kept
// GitHub-friendly in docs/guide/) to the site's absolute /guide/<slug> route,
// so they resolve correctly under Astro's directory build (trailing slash).
function rewriteGuideLinks() {
  const walk = (node) => {
    if (
      node.tagName === "a" &&
      node.properties &&
      typeof node.properties.href === "string"
    ) {
      const h = node.properties.href;
      let m;
      if (/^\.\/README(?:\.md)?$/.test(h)) node.properties.href = `${base}/guide`;
      else if ((m = h.match(/^\.\/([\w-]+)(?:\.md)?(#[\w-]+)?$/)))
        node.properties.href = `${base}/guide/${m[1]}${m[2] || ""}`;
    }
    (node.children || []).forEach(walk);
  };
  return (tree) => walk(tree);
}

// GitHub Pages serves this project repository under /maximal-site/. Keep the
// base separate from the origin so a future custom domain can switch back to
// root hosting without changing route code throughout the site.
// The landing copy + page structure live in a Markdoc content collection
// (src/content/landing/index.mdoc) rendered through custom tag-components.
// index.astro stays a thin shell that resolves the release (lib/version.ts)
// and passes it in as Markdoc variables, so the version logic is untouched.
export default defineConfig({
  site: "https://stuffbucket.github.io",
  base,
  output: "static",
  trailingSlash: "ignore",
  integrations: [markdoc()],
  markdown: {
    rehypePlugins: [rewriteGuideLinks],
  },
});
